// Shared helpers for driving the Zoom Web Client UI from prepare-zoom.mjs and
// set-zoom-mic.mjs. Selectors cover the English and Japanese interfaces.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeDir = resolve(repoRoot, ".meeting-copilot-runtime");
const deviceStatePath = resolve(runtimeDir, "zoom-devices.json");

export const MICROPHONE_DEVICE = /BlackHole 16ch/i;
export const SPEAKER_DEVICE = /BlackHole 2ch/i;

// Kept narrow on purpose: a broad word such as できません also appears in
// harmless messages ("カメラを使用できません") and must not read as a
// rejected admission.
export const REJECTED_TEXT = /been removed|removed by the host|参加できません|入室できません|退出させられました|invalid meeting id|無効なミーティング/i;

// The Web Client renders in the top document on zoom.us/wc, but some flows
// (browser-join interstitial, embedded client) place it in an iframe.
export function candidateFrames(page) {
  return page
    .frames()
    .filter((frame) => /zoom\.us/i.test(frame.url()) || frame === page.mainFrame());
}

async function locatorIsVisible(locator) {
  try {
    return (await locator.count()) > 0 && (await locator.first().isVisible());
  } catch {
    return false;
  }
}

export async function findVisible(page, buildLocators) {
  for (const frame of candidateFrames(page)) {
    for (const locator of buildLocators(frame)) {
      if (await locatorIsVisible(locator)) {
        return locator.first();
      }
    }
  }
  return null;
}

export async function clickVisible(page, buildLocators, timeout = 2_000) {
  const target = await findVisible(page, buildLocators);
  if (!target) {
    return false;
  }
  try {
    await target.click({ timeout });
    return true;
  } catch {
    return false;
  }
}

export async function bodyText(page) {
  const texts = await Promise.all(
    candidateFrames(page).map((frame) =>
      frame.locator("body").innerText({ timeout: 1_000 }).catch(() => ""),
    ),
  );
  return texts.join("\n");
}

// Zoom labels its toggles with the action they perform, so a visible "Mute"
// control means the microphone is currently on.
export function microphoneOffControls(frame) {
  return [
    frame.getByRole("button", { name: /^mute my (microphone|audio)|^(mute|ミュート)(\s|$)/i }).filter({ hasNotText: /un|解除/i }),
    frame.locator('button[aria-label*="mute" i]:not([aria-label*="unmute" i])'),
    frame.locator('button[aria-label*="ミュートする"], button[aria-label^="ミュート"]:not([aria-label*="解除"])'),
  ];
}

export function microphoneOnControls(frame) {
  return [
    frame.getByRole("button", { name: /unmute my (microphone|audio)|unmute|ミュート(を)?解除/i }),
    frame.locator('button[aria-label*="unmute" i], button[aria-label*="ミュート解除"], button[aria-label*="ミュートを解除"]'),
  ];
}

export function cameraOffControls(frame) {
  return [
    frame.getByRole("button", { name: /stop video|ビデオの停止|ビデオを停止/i }),
    frame.locator('button[aria-label*="stop video" i], button[aria-label*="ビデオの停止"], button[aria-label*="ビデオを停止"]'),
  ];
}

export function cameraOnControls(frame) {
  return [
    frame.getByRole("button", { name: /start video|ビデオの開始|ビデオを開始/i }),
    frame.locator('button[aria-label*="start video" i], button[aria-label*="ビデオの開始"], button[aria-label*="ビデオを開始"]'),
  ];
}

// Computer audio must be joined explicitly or the participant hears nothing
// and cannot speak. The dialog can reappear after a waiting room admission.
export async function joinComputerAudioIfOffered(page) {
  const clicked = await clickVisible(page, (frame) => [
    frame.getByRole("button", { name: /join audio by computer|コンピュータ(ー)?(で)?オーディオ(に|で)参加/i }),
    frame.locator("button").filter({ hasText: /join audio by computer|コンピュータ(ー)?.*オーディオ/i }),
  ], 2_000);
  if (clicked) {
    await page.waitForTimeout(1_000);
  }
  return clicked;
}

// Device selection through the audio menu next to the microphone button. Zoom
// revises this UI often, so a failure reports "not-found" instead of throwing;
// callers must keep the microphone muted until both devices are "selected".
export async function selectAudioDevices(page) {
  const audioMenuButtons = (frame) => [
    frame.getByRole("button", { name: /audio settings|オーディオ設定|more audio controls|音声オプション/i }),
    frame.locator('button[aria-label*="audio settings" i], button[aria-label*="オーディオ設定"]'),
    frame.locator(".join-audio-container__arrow, .audio-option-menu__arrow"),
  ];

  const opened = await clickVisible(page, audioMenuButtons, 2_000);
  if (!opened) {
    return { microphone: "not-found", speaker: "not-found" };
  }

  async function pickDevice(devicePattern) {
    const item = await findVisible(page, (frame) => [
      frame.getByRole("menuitem", { name: devicePattern }),
      frame.getByRole("menuitemradio", { name: devicePattern }),
      frame.locator("a, li, button").filter({ hasText: devicePattern }),
    ]);
    if (!item) {
      return "not-found";
    }
    try {
      await item.click({ timeout: 2_000 });
      return "selected";
    } catch {
      return "not-found";
    }
  }

  const microphone = await pickDevice(MICROPHONE_DEVICE);
  // Re-open the menu; some layouts close it after each selection.
  await clickVisible(page, audioMenuButtons, 1_000);
  const speaker = await pickDevice(SPEAKER_DEVICE);
  await page.keyboard.press("Escape").catch(() => {});
  return { microphone, speaker };
}

export function devicesVerified(devices) {
  return devices?.microphone === "selected" && devices?.speaker === "selected";
}

function meetingKey(value) {
  try {
    const url = new URL(value);
    // The Web Client can drop the trailing /join segment after admission.
    const pathname = url.pathname.replace(/\/$/, "").replace(/\/join$/, "");
    return `${url.origin}${pathname}`;
  } catch {
    return "";
  }
}

// prepare-zoom.mjs records whether both BlackHole devices were confirmed so
// that set-zoom-mic.mjs can refuse to unmute an unverified participant, e.g.
// after a waiting room admission that happened once prepare-zoom.mjs exited.
export function readTrackedDevices(meetingUrl) {
  if (!existsSync(deviceStatePath)) {
    return null;
  }
  try {
    const tracked = JSON.parse(readFileSync(deviceStatePath, "utf8"));
    if (meetingKey(tracked.meetingUrl) === meetingKey(meetingUrl)) {
      return { microphone: tracked.microphone, speaker: tracked.speaker };
    }
  } catch {
    // Ignore a missing or interrupted previous state write.
  }
  return null;
}

export function writeTrackedDevices(meetingUrl, devices) {
  mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  const temporaryPath = `${deviceStatePath}.${process.pid}.tmp`;
  writeFileSync(
    temporaryPath,
    `${JSON.stringify(
      { meetingUrl, ...devices, updatedAt: new Date().toISOString() },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
  renameSync(temporaryPath, deviceStatePath);
}
