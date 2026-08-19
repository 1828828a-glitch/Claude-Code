#!/usr/bin/env node

// Mutes or unmutes the dedicated Zoom Web Client participant. Mirrors
// set-meet-mic.mjs from the upstream Google Meet version
// (https://github.com/bb8ad8/meeting-copilot). Refuses to unmute (exit 18)
// until both BlackHole devices are confirmed, because a wrong device loops
// the meeting audio back into the meeting.

import { chromium } from "playwright-core";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bodyText,
  devicesVerified,
  joinComputerAudioIfOffered,
  microphoneOffControls,
  microphoneOnControls,
  readTrackedDevices,
  REJECTED_TEXT,
  selectAudioDevices,
  writeTrackedDevices,
} from "./zoom-ui.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeDir = resolve(repoRoot, ".meeting-copilot-runtime");
const micStatePath = resolve(runtimeDir, "zoom-mic.json");

const args = process.argv.slice(2);
const options = {
  cdp: "http://127.0.0.1:9223",
  assumeBefore: "",
  state: "",
  wait: 0,
};

function usage() {
  process.stdout.write(`Usage: node scripts/set-zoom-mic.mjs [options]\n\nOptions:\n  --cdp URL             Chrome DevTools endpoint (default: ${options.cdp})\n  --state STATE         muted, unmuted, or toggle\n  --wait SEC            Wait for admission before changing the mic (default: 0)\n  --assume-before STATE Use muted or unmuted if the Zoom control is hidden\n  -h, --help            Show this help\n\nExit codes:\n  18  Unmute was requested, but the BlackHole devices are unverified.\n`);
}

for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  switch (argument) {
    case "--cdp":
      options.cdp = args[++index] || "";
      break;
    case "--state":
      options.state = args[++index] || "";
      break;
    case "--assume-before":
      options.assumeBefore = args[++index] || "";
      break;
    case "--wait":
      options.wait = Number(args[++index]);
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

if (!new Set(["muted", "unmuted", "toggle"]).has(options.state)) {
  process.stderr.write("--state must be muted, unmuted, or toggle.\n");
  process.exit(2);
}

if (options.assumeBefore && !new Set(["muted", "unmuted"]).has(options.assumeBefore)) {
  process.stderr.write("--assume-before must be muted or unmuted.\n");
  process.exit(2);
}

if (!Number.isFinite(options.wait) || options.wait < 0) {
  process.stderr.write("--wait must be a non-negative number.\n");
  process.exit(2);
}

const browser = await chromium.connectOverCDP(options.cdp);
const context = browser.contexts()[0];
if (!context) {
  throw new Error("Chrome did not expose a browser context.");
}

const page = context
  .pages()
  .find((candidate) => /https:\/\/([a-z0-9-]+\.)*zoom\.us\//i.test(candidate.url()));
if (!page) {
  throw new Error("An active Zoom page was not found.");
}

page.setDefaultTimeout(5_000);

function meetingKey(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return "";
  }
}

function readTrackedState(meetingUrl) {
  if (!existsSync(micStatePath)) {
    return "";
  }
  try {
    const tracked = JSON.parse(readFileSync(micStatePath, "utf8"));
    if (
      meetingKey(tracked.meetingUrl) === meetingKey(meetingUrl) &&
      new Set(["muted", "unmuted"]).has(tracked.state)
    ) {
      return tracked.state;
    }
  } catch {
    // Ignore a missing or interrupted previous state write.
  }
  return "";
}

function writeTrackedState(meetingUrl, state) {
  if (!new Set(["muted", "unmuted"]).has(state)) {
    return;
  }
  mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  const temporaryPath = `${micStatePath}.${process.pid}.tmp`;
  writeFileSync(
    temporaryPath,
    `${JSON.stringify({ meetingUrl, state, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    { mode: 0o600 },
  );
  renameSync(temporaryPath, micStatePath);
}

async function firstVisible(buildLocators) {
  for (const frame of page.frames()) {
    for (const locator of buildLocators(frame)) {
      try {
        if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
          return locator.first();
        }
      } catch {
        // Zoom changes frequently; try the next representation of the control.
      }
    }
  }
  return null;
}

async function currentState() {
  if (await firstVisible(microphoneOnControls)) {
    return "muted";
  }
  if (await firstVisible(microphoneOffControls)) {
    return "unmuted";
  }
  return "unavailable";
}

async function assertNotRejected() {
  const text = await bodyText(page);
  if (REJECTED_TEXT.test(text)) {
    throw new Error("Zoom rejected this participant.");
  }
}

// The footer hides itself when the pointer is idle; hovering the page keeps
// the controls queryable.
await page.mouse.move(200, 200).catch(() => {});
await joinComputerAudioIfOffered(page);

let before = await currentState();
if (before === "unavailable" && options.wait > 0) {
  const deadline = Date.now() + options.wait * 1_000;
  while (before === "unavailable" && Date.now() < deadline) {
    await assertNotRejected();
    await page.waitForTimeout(1_000);
    await page.mouse.move(210, 210).catch(() => {});
    await joinComputerAudioIfOffered(page);
    before = await currentState();
  }
}

const trackedBefore = readTrackedState(page.url());
if (
  before === "unavailable" &&
  !options.assumeBefore &&
  !trackedBefore &&
  options.state !== "toggle"
) {
  await assertNotRejected();
  throw new Error("The Zoom microphone is unavailable or admission timed out.");
}

const effectiveBefore =
  before === "unavailable" ? options.assumeBefore || trackedBefore : before;
const desired =
  options.state === "toggle"
    ? effectiveBefore === "muted"
      ? "unmuted"
      : effectiveBefore === "unmuted"
        ? "muted"
        : "toggled"
    : options.state;

// Muting is always safe; unmuting is only safe when both BlackHole devices
// were confirmed, otherwise the participant loops meeting audio back into
// the meeting or feeds the wrong stream to ChatGPT.
let deviceStatus = "not-checked";
if (desired === "unmuted" || desired === "toggled") {
  let devices = readTrackedDevices(page.url());
  if (!devicesVerified(devices)) {
    devices = await selectAudioDevices(page);
    writeTrackedDevices(page.url(), devices);
  }
  if (!devicesVerified(devices)) {
    process.stdout.write(
      `${JSON.stringify(
        {
          status: "devices-unverified",
          url: page.url(),
          microphoneDevice: devices?.microphone ?? "unknown",
          speakerDevice: devices?.speaker ?? "unknown",
          hint: "Select BlackHole 16ch (microphone) and BlackHole 2ch (speaker) in the Zoom audio menu, then rerun.",
        },
        null,
        2,
      )}\n`,
    );
    process.exit(18);
  }
  deviceStatus = "verified";
}

async function pressShortcut() {
  // The Web Client documents Alt+A for mute/unmute; some macOS layouts use
  // Shift+Command+A instead.
  await page.keyboard.press("Alt+a");
  await page.waitForTimeout(500);
  if ((await currentState()) === desired) {
    return;
  }
  if (process.platform === "darwin") {
    await page.keyboard.press("Meta+Shift+a");
    await page.waitForTimeout(500);
  }
}

let usedKeyboardShortcut = false;
if (before === "unavailable") {
  if (desired !== effectiveBefore) {
    await pressShortcut();
    usedKeyboardShortcut = true;
  }
} else if (before !== desired) {
  const control = await firstVisible(
    desired === "unmuted" ? microphoneOnControls : microphoneOffControls,
  );
  if (control) {
    await control.click();
  } else {
    await pressShortcut();
    usedKeyboardShortcut = true;
  }
}

let detectedAfter = await currentState();
if (desired !== "toggled" && detectedAfter !== desired) {
  for (let attempt = 0; attempt < 20 && detectedAfter !== desired; attempt += 1) {
    await page.waitForTimeout(100);
    detectedAfter = await currentState();
  }
}
const verified = desired !== "toggled" && detectedAfter === desired;
if (!verified) {
  throw new Error(`The Zoom microphone did not change to ${desired}.`);
}
const after = detectedAfter;

writeTrackedState(page.url(), detectedAfter);

process.stdout.write(
  `${JSON.stringify(
    {
      status: "ok",
      url: page.url(),
      before,
      after,
      detectedAfter,
      verified,
      deviceStatus,
      usedKeyboardShortcut,
    },
    null,
    2,
  )}\n`,
);
process.exit(0);
