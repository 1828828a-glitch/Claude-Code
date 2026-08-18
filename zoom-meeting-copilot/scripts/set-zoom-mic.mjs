#!/usr/bin/env node

// Mutes or unmutes the dedicated Zoom Web Client participant. Mirrors
// set-meet-mic.mjs from the upstream Google Meet version
// (https://github.com/bb8ad8/meeting-copilot).

import { chromium } from "playwright-core";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  process.stdout.write(`Usage: node scripts/set-zoom-mic.mjs [options]\n\nOptions:\n  --cdp URL             Chrome DevTools endpoint (default: ${options.cdp})\n  --state STATE         muted, unmuted, or toggle\n  --wait SEC            Wait for admission before changing the mic (default: 0)\n  --assume-before STATE Use muted or unmuted if the Zoom control is hidden\n  -h, --help            Show this help\n`);
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

function candidateFrames() {
  return page
    .frames()
    .filter((frame) => /zoom\.us/i.test(frame.url()) || frame === page.mainFrame());
}

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

// Zoom labels the footer button with the action it performs, so a visible
// "Unmute" control means the microphone is currently muted.
function unmuteControls(frame) {
  return [
    frame.getByRole("button", { name: /unmute my (microphone|audio)|unmute|ミュート(を)?解除/i }),
    frame.locator('button[aria-label*="unmute" i], button[aria-label*="ミュート解除"], button[aria-label*="ミュートを解除"]'),
  ];
}

function muteControls(frame) {
  return [
    frame.getByRole("button", { name: /^mute my (microphone|audio)|^(mute|ミュート)(\s|$)/i }).filter({ hasNotText: /un|解除/i }),
    frame.locator('button[aria-label*="mute" i]:not([aria-label*="unmute" i])'),
    frame.locator('button[aria-label*="ミュートする"], button[aria-label^="ミュート"]:not([aria-label*="解除"])'),
  ];
}

async function locatorIsVisible(locator) {
  try {
    return (await locator.count()) > 0 && (await locator.first().isVisible());
  } catch {
    return false;
  }
}

async function firstVisible(buildLocators) {
  for (const frame of candidateFrames()) {
    for (const locator of buildLocators(frame)) {
      if (await locatorIsVisible(locator)) {
        return locator.first();
      }
    }
  }
  return null;
}

async function currentState() {
  if (await firstVisible(unmuteControls)) {
    return "muted";
  }
  if (await firstVisible(muteControls)) {
    return "unmuted";
  }
  return "unavailable";
}

async function bodyText() {
  const texts = await Promise.all(
    candidateFrames().map((frame) =>
      frame.locator("body").innerText({ timeout: 1_000 }).catch(() => ""),
    ),
  );
  return texts.join("\n");
}

// Admission through a waiting room can land after prepare-zoom.mjs already
// exited, leaving computer audio unjoined; the mic control only appears once
// audio is connected.
async function joinComputerAudioIfOffered() {
  const button = await firstVisible((frame) => [
    frame.getByRole("button", { name: /join audio by computer|コンピュータ(ー)?(で)?オーディオ(に|で)参加/i }),
    frame.locator("button").filter({ hasText: /join audio by computer|コンピュータ(ー)?.*オーディオ/i }),
  ]);
  if (button) {
    await button.click({ timeout: 2_000 }).catch(() => {});
    await page.waitForTimeout(1_000);
  }
}

// The footer hides itself when the pointer is idle; hovering the page keeps
// the controls queryable.
await page.mouse.move(200, 200).catch(() => {});
await joinComputerAudioIfOffered();

let before = await currentState();
if (before === "unavailable" && options.wait > 0) {
  const deadline = Date.now() + options.wait * 1_000;
  while (before === "unavailable" && Date.now() < deadline) {
    const text = await bodyText();
    if (/been removed|できません|invalid meeting/i.test(text)) {
      throw new Error("Zoom rejected this participant.");
    }
    await page.waitForTimeout(1_000);
    await page.mouse.move(210, 210).catch(() => {});
    await joinComputerAudioIfOffered();
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
  const text = await bodyText();
  if (/been removed|できません|invalid meeting/i.test(text)) {
    throw new Error("Zoom rejected this participant.");
  }
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
  const control = await firstVisible(desired === "unmuted" ? unmuteControls : muteControls);
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
      usedKeyboardShortcut,
    },
    null,
    2,
  )}\n`,
);
process.exit(0);
