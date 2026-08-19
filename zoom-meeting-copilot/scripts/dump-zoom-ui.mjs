#!/usr/bin/env node

// Debug helper: prints the interactive elements of the currently open Zoom
// tab in the dedicated Chrome profile. Run it while the pre-join screen or
// the meeting is visible, and paste the output into an issue so selector
// mismatches can be fixed without screen access.
//
//   node scripts/dump-zoom-ui.mjs [--cdp http://127.0.0.1:9223]

import { chromium } from "playwright-core";

const args = process.argv.slice(2);
let cdp = `http://127.0.0.1:${process.env.MEETING_COPILOT_CDP_PORT || 9223}`;
const cdpIndex = args.indexOf("--cdp");
if (cdpIndex !== -1) {
  cdp = args[cdpIndex + 1] || cdp;
}

const browser = await chromium.connectOverCDP(cdp);
const context = browser.contexts()[0];
if (!context) {
  process.stderr.write("Chrome did not expose a browser context.\n");
  process.exit(1);
}

const page = context
  .pages()
  .find((candidate) => /https:\/\/([a-z0-9-]+\.)*zoom\.us\//i.test(candidate.url()));
if (!page) {
  process.stderr.write("An open Zoom page was not found in the dedicated Chrome.\n");
  process.exit(1);
}

process.stdout.write(`page: ${page.url()}\ntitle: ${await page.title().catch(() => "")}\n`);

for (const frame of page.frames()) {
  if (frame !== page.mainFrame() && !/zoom\.us/i.test(frame.url())) {
    continue;
  }
  const data = await frame
    .evaluate(() => {
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const pick = (el) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        label: el.getAttribute("aria-label") || undefined,
        text: (el.textContent || "").trim().slice(0, 50) || undefined,
        class: (typeof el.className === "string" && el.className.slice(0, 80)) || undefined,
      });
      return {
        buttons: [...document.querySelectorAll('button, [role="button"], a')]
          .filter(visible)
          .slice(0, 80)
          .map(pick),
        inputs: [...document.querySelectorAll("input, textarea")].filter(visible).map(pick),
        bodyText: (document.body?.innerText || "").trim().slice(0, 400),
      };
    })
    .catch(() => null);

  process.stdout.write(`\n=== frame: ${frame.url()}\n`);
  process.stdout.write(`${JSON.stringify(data, null, 1)}\n`);
}

process.exit(0);
