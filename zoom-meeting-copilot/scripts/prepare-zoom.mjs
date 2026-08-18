#!/usr/bin/env node

// Prepares the dedicated Chrome profile's Zoom Web Client tab: display name,
// passcode, muted microphone, disabled camera, BlackHole audio devices, and an
// optional automatic join. Mirrors prepare-meet.mjs from the upstream
// Google Meet version (https://github.com/bb8ad8/meeting-copilot).

import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const options = {
  cdp: "http://127.0.0.1:9223",
  join: false,
  joinDelay: 2,
  name: "GPT-Live",
  passcode: process.env.MEETING_COPILOT_ZOOM_PASSCODE || "",
  url: "",
};

function usage() {
  process.stdout.write(`Usage: node scripts/prepare-zoom.mjs [options]\n\nOptions:\n  --cdp URL        Chrome DevTools endpoint (default: ${options.cdp})\n  --name NAME      Zoom participant name (default: ${options.name})\n  --url URL        Zoom Web Client join URL (https://…zoom.us/wc/MEETING_ID/join)\n  --passcode CODE  Meeting passcode when it is not embedded in the URL\n  --join           Click Join after preparing the pre-join screen\n  --join-delay SEC Wait before clicking Join (default: ${options.joinDelay})\n  -h, --help       Show this help\n`);
}

for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  switch (argument) {
    case "--cdp":
      options.cdp = args[++index] || "";
      break;
    case "--name":
      options.name = args[++index] || "";
      break;
    case "--url":
      options.url = args[++index] || "";
      break;
    case "--passcode":
      options.passcode = args[++index] || "";
      break;
    case "--join":
      options.join = true;
      break;
    case "--join-delay":
      options.joinDelay = Number(args[++index]);
      break;
    case "-h":
    case "--help":
      usage();
      process.exit(0);
      break;
    default:
      process.stderr.write(`Unknown argument: ${argument}\n`);
      usage();
      process.exit(2);
  }
}

let meetingOrigin = "";
try {
  const parsed = new URL(options.url);
  if (!/(^|\.)zoom\.us$/.test(parsed.hostname) || parsed.protocol !== "https:") {
    throw new Error("not a zoom.us URL");
  }
  meetingOrigin = parsed.origin;
} catch {
  process.stderr.write("A Zoom Web Client URL is required with --url.\n");
  process.exit(2);
}

if (!Number.isFinite(options.joinDelay) || options.joinDelay < 0) {
  process.stderr.write("--join-delay must be a non-negative number.\n");
  process.exit(2);
}

const MICROPHONE_DEVICE = /BlackHole 16ch/i;
const SPEAKER_DEVICE = /BlackHole 2ch/i;

const browser = await chromium.connectOverCDP(options.cdp);
const contexts = browser.contexts();
if (contexts.length === 0) {
  throw new Error("Chrome did not expose a browser context.");
}

const context = contexts[0];
await context.grantPermissions(["microphone"], { origin: meetingOrigin });

const zoomPages = context
  .pages()
  .filter((candidate) => /https:\/\/([a-z0-9-]+\.)*zoom\.us\//i.test(candidate.url()));
let page = zoomPages.find((candidate) => candidate.url().startsWith(options.url)) || zoomPages[0];
await Promise.all(
  zoomPages
    .filter((candidate) => candidate !== page)
    .map((candidate) => candidate.close()),
);

if (!page) {
  page = await context.newPage();
  await page.goto(options.url, { waitUntil: "domcontentloaded" });
} else if (!page.url().startsWith(options.url)) {
  await page.goto(options.url, { waitUntil: "domcontentloaded" });
}

await page.bringToFront();
await page.waitForLoadState("domcontentloaded");
page.setDefaultTimeout(5_000);

// The Web Client renders in the top document on zoom.us/wc, but some flows
// (browser-join interstitial, embedded client) place it in an iframe.
function candidateFrames() {
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

async function findVisible(buildLocators) {
  for (const frame of candidateFrames()) {
    for (const locator of buildLocators(frame)) {
      if (await locatorIsVisible(locator)) {
        return locator.first();
      }
    }
  }
  return null;
}

async function clickVisible(buildLocators, timeout = 2_000) {
  const target = await findVisible(buildLocators);
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

async function bodyText() {
  const texts = await Promise.all(
    candidateFrames().map((frame) =>
      frame.locator("body").innerText({ timeout: 1_000 }).catch(() => ""),
    ),
  );
  return texts.join("\n");
}

let nameFilled = false;
let passcodeFilled = false;
let microphoneState = "unavailable";
let cameraState = "unavailable";
let devices = { microphone: "unknown", speaker: "unknown" };
let joinStatus = "not-requested";

// Dismiss the cookie banner when the region shows one; it can cover the
// pre-join controls.
await clickVisible((frame) => [
  frame.locator("#onetrust-accept-btn-handler"),
  frame.getByRole("button", { name: /accept cookies|すべて(の Cookie を)?受け入れる/i }),
], 1_000);

// A /j/ URL that slipped through redirects to the launcher page; move to the
// browser client when Zoom offers the link.
await clickVisible((frame) => [
  frame.getByRole("link", { name: /join from your browser|ブラウザから参加/i }),
  frame.locator('a[web_client], a.mbTuHb, a[href*="/wc/"]').filter({ hasText: /browser|ブラウザ/i }),
], 1_500);
await page.waitForLoadState("domcontentloaded");

const pageText = await bodyText();
if (/sign in to join|この(ミーティング|会議)は認証|authorized attendees only|サインインしてください/i.test(pageText)) {
  report({ joinStatus: "signin-required" });
  process.exit(13);
}

async function fillFirst(buildLocators, value) {
  const field = await findVisible(buildLocators);
  if (!field) {
    return false;
  }
  try {
    await field.fill(value);
    return true;
  } catch {
    return false;
  }
}

nameFilled = await fillFirst((frame) => [
  frame.locator("#input-for-name"),
  frame.getByPlaceholder(/your name|名前を入力|お名前/i),
  frame.getByLabel(/^(name|名前)$/i),
], options.name);

const passcodeField = await findVisible((frame) => [
  frame.locator("#input-for-pwd"),
  frame.getByPlaceholder(/passcode|パスコード/i),
  frame.getByLabel(/passcode|パスコード/i),
]);
if (passcodeField) {
  const existing = (await passcodeField.inputValue().catch(() => "")) || "";
  if (existing) {
    passcodeFilled = true;
  } else if (options.passcode) {
    await passcodeField.fill(options.passcode);
    passcodeFilled = true;
  } else {
    report({ joinStatus: "passcode-required", participantNameFilled: nameFilled });
    process.exit(17);
  }
}

// Pre-join microphone and camera toggles. Zoom labels the buttons with the
// resulting action, so "Unmute" visible means the microphone is currently off.
function microphoneOffControls(frame) {
  return [
    frame.getByRole("button", { name: /^(mute|ミュート)(\s|$)/i }).filter({ hasNotText: /un|解除/i }),
    frame.locator('button[aria-label*="mute" i]:not([aria-label*="unmute" i])'),
    frame.locator('button[aria-label*="ミュートする"], button[aria-label^="ミュート"]:not([aria-label*="解除"])'),
  ];
}

function microphoneOnControls(frame) {
  return [
    frame.getByRole("button", { name: /unmute|ミュート(を)?解除/i }),
    frame.locator('button[aria-label*="unmute" i], button[aria-label*="ミュート解除"], button[aria-label*="ミュートを解除"]'),
  ];
}

function cameraOffControls(frame) {
  return [
    frame.getByRole("button", { name: /stop video|ビデオの停止|ビデオを停止/i }),
    frame.locator('button[aria-label*="stop video" i], button[aria-label*="ビデオの停止"], button[aria-label*="ビデオを停止"]'),
  ];
}

function cameraOnControls(frame) {
  return [
    frame.getByRole("button", { name: /start video|ビデオの開始|ビデオを開始/i }),
    frame.locator('button[aria-label*="start video" i], button[aria-label*="ビデオの開始"], button[aria-label*="ビデオを開始"]'),
  ];
}

async function visibleControlState({ on, off }) {
  if (await findVisible(on)) {
    return "on";
  }
  if (await findVisible(off)) {
    return "off";
  }
  return "unavailable";
}

microphoneState = await visibleControlState({
  on: microphoneOffControls,
  off: microphoneOnControls,
});
if (microphoneState === "on") {
  await clickVisible(microphoneOffControls);
  await page.waitForTimeout(300);
  microphoneState = await visibleControlState({
    on: microphoneOffControls,
    off: microphoneOnControls,
  });
}

cameraState = await visibleControlState({
  on: cameraOffControls,
  off: cameraOnControls,
});
if (cameraState === "on") {
  await clickVisible(cameraOffControls);
  await page.waitForTimeout(300);
  cameraState = await visibleControlState({
    on: cameraOffControls,
    off: cameraOnControls,
  });
}
if (cameraState === "on") {
  throw new Error("The Zoom camera could not be disabled before joining.");
}

// Device selection. The pre-join screen and the in-meeting footer expose an
// audio menu next to the microphone button; Zoom revises this UI often, so a
// failure here downgrades to manual selection instead of aborting.
async function selectAudioDevices() {
  const opened = await clickVisible((frame) => [
    frame.getByRole("button", { name: /audio settings|オーディオ設定|more audio controls|音声オプション/i }),
    frame.locator('button[aria-label*="audio settings" i], button[aria-label*="オーディオ設定"]'),
    frame.locator(".join-audio-container__arrow, .audio-option-menu__arrow"),
  ], 2_000);
  if (!opened) {
    return { microphone: "unknown", speaker: "unknown" };
  }

  async function pickDevice(sectionPattern, devicePattern) {
    const item = await findVisible((frame) => [
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

  const microphone = await pickDevice(/select a microphone|マイクを選択/i, MICROPHONE_DEVICE);
  // Re-open the menu; some layouts close it after each selection.
  await clickVisible((frame) => [
    frame.getByRole("button", { name: /audio settings|オーディオ設定|more audio controls|音声オプション/i }),
    frame.locator(".join-audio-container__arrow, .audio-option-menu__arrow"),
  ], 1_000);
  const speaker = await pickDevice(/select a speaker|スピーカーを選択/i, SPEAKER_DEVICE);
  await page.keyboard.press("Escape").catch(() => {});
  return { microphone, speaker };
}

devices = await selectAudioDevices();

if (options.join) {
  const joinButtons = (frame) => [
    frame.getByRole("button", { name: /^(join|参加)$/i }),
    frame.locator("button.preview-join-button, button.zm-btn--primary").filter({ hasText: /join|参加/i }),
  ];

  const joinButton = await findVisible(joinButtons);
  if (!joinButton) {
    const text = await bodyText();
    if (/leave|退出/i.test(text)) {
      joinStatus = "already-joined";
    } else {
      joinStatus = "requested-status-unknown";
    }
  } else {
    await page.waitForTimeout(options.joinDelay * 1_000);
    await joinButton.click({ timeout: 5_000 });

    await page
      .waitForFunction(
        () => {
          const text = document.body?.innerText || "";
          return (
            /host will let you in|waiting for the host|まもなくミーティング|お待ちください|入室を許可/i.test(text) ||
            /join audio|オーディオに参加/i.test(text) ||
            /leave|退出/i.test(text) ||
            /removed|できません|invalid|無効/i.test(text)
          );
        },
        undefined,
        { timeout: 30_000 },
      )
      .catch(() => {});

    const text = await bodyText();
    if (/incorrect passcode|パスコードが(正しく|違)/i.test(text)) {
      joinStatus = "passcode-rejected";
    } else if (/host will let you in|waiting for the host|まもなくミーティング|お待ちください|入室を許可/i.test(text)) {
      joinStatus = "waiting-for-admission";
    } else if (/been removed|できません|declined/i.test(text)) {
      joinStatus = "rejected";
    } else if (/join audio|オーディオに参加|leave|退出|mute|ミュート/i.test(text)) {
      joinStatus = "joined";
    } else {
      joinStatus = "requested-status-unknown";
    }
  }

  if (joinStatus === "joined" || joinStatus === "already-joined") {
    // Computer audio must be joined explicitly or the participant hears
    // nothing and cannot speak.
    await clickVisible((frame) => [
      frame.getByRole("button", { name: /join audio by computer|コンピュータ(ー)?(で)?オーディオ(に|で)参加/i }),
      frame.locator("button").filter({ hasText: /join audio by computer|コンピュータ(ー)?.*オーディオ/i }),
    ], 10_000);
    await page.waitForTimeout(1_000);

    // Devices can only be confirmed once the in-meeting footer exists.
    if (devices.microphone !== "selected" || devices.speaker !== "selected") {
      const retried = await selectAudioDevices();
      devices = {
        microphone: devices.microphone === "selected" ? "selected" : retried.microphone,
        speaker: devices.speaker === "selected" ? "selected" : retried.speaker,
      };
    }

    // Re-verify the microphone stays muted after joining audio.
    const inMeetingMicState = await visibleControlState({
      on: microphoneOffControls,
      off: microphoneOnControls,
    });
    if (inMeetingMicState === "on") {
      await clickVisible(microphoneOffControls);
    }
  }
}

function report(overrides = {}) {
  const result = {
    url: page.url(),
    permission: `microphone granted for ${meetingOrigin}`,
    participantNameFilled: nameFilled,
    passcodeFilled: passcodeFilled,
    microphoneMuted: microphoneState === "off",
    cameraDisabled: cameraState !== "on",
    cameraState,
    microphoneDevice: devices.microphone,
    speakerDevice: devices.speaker,
    joinStatus,
    ...overrides,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

report({ title: await page.title().catch(() => "") });

if (joinStatus === "rejected" || joinStatus === "passcode-rejected") {
  process.exit(14);
}
if (joinStatus === "requested-status-unknown") {
  process.exit(15);
}
if (
  options.join &&
  (joinStatus === "joined" || joinStatus === "already-joined") &&
  (devices.microphone !== "selected" || devices.speaker !== "selected")
) {
  // The meeting was joined but BlackHole devices could not be confirmed from
  // the UI; the operator must verify them before unmuting.
  process.exit(18);
}
process.exit(0);
