#!/usr/bin/env node

// Prepares the dedicated Chrome profile's Zoom Web Client tab: display name,
// passcode, muted microphone, disabled camera, BlackHole audio devices, and an
// optional automatic join. Mirrors prepare-meet.mjs from the upstream
// Google Meet version (https://github.com/bb8ad8/meeting-copilot).

import { chromium } from "playwright-core";
import {
  bodyText,
  cameraOffControls,
  cameraOnControls,
  clickVisible,
  devicesVerified,
  findVisible,
  joinComputerAudioIfOffered,
  microphoneOffControls,
  microphoneOnControls,
  REJECTED_TEXT,
  selectAudioDevices,
  writeTrackedDevices,
} from "./zoom-ui.mjs";

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

const browser = await chromium.connectOverCDP(options.cdp);
const contexts = browser.contexts();
if (contexts.length === 0) {
  throw new Error("Chrome did not expose a browser context.");
}

const context = contexts[0];
await context.grantPermissions(["microphone"], { origin: meetingOrigin });
// Zoom redirects the join page to app.zoom.us regardless of the invited host.
await context
  .grantPermissions(["microphone"], { origin: "https://app.zoom.us" })
  .catch(() => {});

const meetingId = (options.url.match(/\/wc\/(\d+)/) || [])[1] || "";

// The redirect rewrites host and query, so match pages by meeting ID rather
// than by URL prefix.
function isMeetingPage(candidate) {
  return (
    /https:\/\/([a-z0-9-]+\.)*zoom\.us\//i.test(candidate.url()) &&
    (meetingId === "" || candidate.url().includes(`/wc/${meetingId}`))
  );
}

const zoomPages = context
  .pages()
  .filter((candidate) => /https:\/\/([a-z0-9-]+\.)*zoom\.us\//i.test(candidate.url()));
let page = zoomPages.find(isMeetingPage) || zoomPages[0];
await Promise.all(
  zoomPages
    .filter((candidate) => candidate !== page)
    .map((candidate) => candidate.close()),
);

if (!page) {
  page = await context.newPage();
  await page.goto(options.url, { waitUntil: "domcontentloaded" });
} else if (!isMeetingPage(page)) {
  await page.goto(options.url, { waitUntil: "domcontentloaded" });
}

await page.bringToFront();
await page.waitForLoadState("domcontentloaded");
page.setDefaultTimeout(5_000);

let nameFilled = false;
let passcodeFilled = false;
let microphoneState = "unavailable";
let cameraState = "unavailable";
let devices = { microphone: "unknown", speaker: "unknown" };
let joinStatus = "not-requested";

function report(overrides = {}) {
  const result = {
    url: page.url(),
    permission: `microphone granted for ${meetingOrigin}`,
    participantNameFilled: nameFilled,
    passcodeFilled,
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

// The Web Client is a heavy single-page app: the pre-join controls appear
// several seconds after DOMContentLoaded. Poll until something actionable
// renders instead of querying once and giving up.
const preJoinControls = (frame) => [
  frame.locator("#input-for-name"),
  frame.getByPlaceholder(/your name|名前を入力|お名前/i),
  frame.getByRole("button", { name: /^(join|参加)$/i }),
  frame.getByRole("button", { name: /unmute|ミュート/i }),
];

const preJoinDeadline = Date.now() + 45_000;
let preJoinReady = false;
while (Date.now() < preJoinDeadline) {
  // Dismiss the cookie banner when the region shows one; it can cover the
  // pre-join controls.
  await clickVisible(page, (frame) => [
    frame.locator("#onetrust-accept-btn-handler"),
    frame.getByRole("button", { name: /accept cookies|すべて(の Cookie を)?受け入れる/i }),
  ], 500);

  // A /j/ URL that slipped through redirects to the launcher page; move to
  // the browser client when Zoom offers the link.
  await clickVisible(page, (frame) => [
    frame.getByRole("link", { name: /join from your browser|ブラウザから参加/i }),
    frame.locator('a[web_client], a.mbTuHb, a[href*="/wc/"]').filter({ hasText: /browser|ブラウザ/i }),
  ], 500);

  const pageText = await bodyText(page);
  if (/sign in to join|この(ミーティング|会議)は認証|authorized attendees only|サインインしてください/i.test(pageText)) {
    report({ joinStatus: "signin-required" });
    process.exit(13);
  }
  const hasCaptcha =
    (await page.locator('iframe[src*="recaptcha"], iframe[src*="hcaptcha"]').count().catch(() => 0)) > 0 ||
    /verify (that )?you are|are you a robot|画像認証|ロボットではあり/i.test(pageText);
  if (hasCaptcha) {
    report({ joinStatus: "captcha-required" });
    process.exit(16);
  }
  if (/leave|退出|join audio|オーディオに参加/i.test(pageText)) {
    // Already inside the meeting from a previous attempt.
    preJoinReady = true;
    break;
  }
  if (await findVisible(page, preJoinControls)) {
    preJoinReady = true;
    break;
  }
  await page.waitForTimeout(1_000);
}
if (!preJoinReady) {
  report({ joinStatus: "prejoin-timeout" });
  process.exit(15);
}
// Give late controls (device menu, camera toggle) a moment to settle.
await page.waitForTimeout(1_000);

async function fillFirst(buildLocators, value) {
  const field = await findVisible(page, buildLocators);
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

const passcodeField = await findVisible(page, (frame) => [
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
    report({ joinStatus: "passcode-required" });
    process.exit(17);
  }
}

async function visibleControlState({ on, off }) {
  if (await findVisible(page, on)) {
    return "on";
  }
  if (await findVisible(page, off)) {
    return "off";
  }
  return "unavailable";
}

microphoneState = await visibleControlState({
  on: microphoneOffControls,
  off: microphoneOnControls,
});
if (microphoneState === "on") {
  await clickVisible(page, microphoneOffControls);
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
  await clickVisible(page, cameraOffControls);
  await page.waitForTimeout(300);
  cameraState = await visibleControlState({
    on: cameraOffControls,
    off: cameraOnControls,
  });
}
if (cameraState === "on") {
  // A camera that errors out (missing device, denied permission) keeps the
  // "stop video" label even though nothing would be broadcast. Treat that as
  // unavailable rather than blocking the join.
  const text = await bodyText(page);
  if (/カメラ.*(エラー|失敗|見つかり|検出|使用できません|アクセスできません)|camera (error|failed|not (found|detected|available|working))|(cannot|can't|unable to) (access|start|detect) (your )?camera/i.test(text)) {
    cameraState = "unavailable";
  }
}

devices = await selectAudioDevices(page);
writeTrackedDevices(options.url, devices);

if (options.join) {
  const joinButtons = (frame) => [
    frame.getByRole("button", { name: /^(join|参加)$/i }),
    frame.locator("button.preview-join-button, button.zm-btn--primary").filter({ hasText: /join|参加/i }),
  ];

  const joinButton = await findVisible(page, joinButtons);
  if (!joinButton) {
    const text = await bodyText(page);
    if (/leave|退出/i.test(text)) {
      joinStatus = "already-joined";
    } else {
      joinStatus = "requested-status-unknown";
    }
  } else if (cameraState === "on") {
    // The camera could not be verified as off; let the operator turn it off
    // and join by hand instead of broadcasting video.
    joinStatus = "camera-state-unknown";
  } else if (microphoneState !== "off") {
    // Never enter the meeting with an unverified microphone; the muted mic is
    // the last line of defense against unintended speech. Leave the pre-join
    // screen to the operator instead of failing outright.
    joinStatus = "microphone-state-unknown";
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
            /been removed|参加できません|入室できません|incorrect passcode|パスコードが|invalid meeting|無効なミーティング/i.test(text)
          );
        },
        undefined,
        { timeout: 30_000 },
      )
      .catch(() => {});

    const text = await bodyText(page);
    if (/incorrect passcode|パスコードが(正しく|違)/i.test(text)) {
      joinStatus = "passcode-rejected";
    } else if (/host will let you in|waiting for the host|まもなくミーティング|お待ちください|入室を許可/i.test(text)) {
      joinStatus = "waiting-for-admission";
    } else if (REJECTED_TEXT.test(text)) {
      joinStatus = "rejected";
    } else if (/join audio|オーディオに参加|leave|退出|mute|ミュート/i.test(text)) {
      joinStatus = "joined";
    } else {
      joinStatus = "requested-status-unknown";
    }
  }

  if (joinStatus === "joined" || joinStatus === "already-joined") {
    await joinComputerAudioIfOffered(page);

    // Devices can only be confirmed once the in-meeting footer exists.
    if (!devicesVerified(devices)) {
      const retried = await selectAudioDevices(page);
      devices = {
        microphone: devices.microphone === "selected" ? "selected" : retried.microphone,
        speaker: devices.speaker === "selected" ? "selected" : retried.speaker,
      };
      writeTrackedDevices(options.url, devices);
    }

    // Re-verify the microphone stays muted after joining audio.
    const inMeetingMicState = await visibleControlState({
      on: microphoneOffControls,
      off: microphoneOnControls,
    });
    if (inMeetingMicState === "on") {
      await clickVisible(page, microphoneOffControls);
    }
  }
}

report({ title: await page.title().catch(() => "") });

if (joinStatus === "rejected" || joinStatus === "passcode-rejected") {
  process.exit(14);
}
if (joinStatus === "requested-status-unknown" || joinStatus === "microphone-state-unknown") {
  process.exit(15);
}
if (joinStatus === "camera-state-unknown") {
  process.exit(16);
}
if (
  options.join &&
  (joinStatus === "joined" || joinStatus === "already-joined") &&
  !devicesVerified(devices)
) {
  // The meeting was joined but BlackHole devices could not be confirmed from
  // the UI; the operator must verify them before unmuting.
  process.exit(18);
}
process.exit(0);
