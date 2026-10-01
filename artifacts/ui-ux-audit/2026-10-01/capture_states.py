"""Read-only interaction captures for the Jeralis UX audit."""

import json
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE = "https://ai-reading-companion-alpha.vercel.app"
BOOK = "/book/afd3e20d-f9c0-4054-96c5-26b0c6ad6483"
ROOT = Path(__file__).parent
OUT = ROOT / "states"
OUT.mkdir(exist_ok=True)


def capture(page, name):
    page.screenshot(path=str(OUT / name), full_page=True)


def sizes(page):
    return page.evaluate(
        """() => ({
          viewport: [innerWidth, innerHeight],
          scrollWidth: document.documentElement.scrollWidth,
          reader: (() => {
            const e = document.querySelector('.reader-text');
            if (!e) return null;
            const r = e.getBoundingClientRect();
            return { top: Math.round(r.top), width: Math.round(r.width) };
          })()
        })"""
    )


report = {}
with sync_playwright() as p:
    browser = p.chromium.launch()
    for size, width, height in [("desktop", 1440, 900), ("mobile", 375, 812)]:
        context = browser.new_context(
            viewport={"width": width, "height": height},
            storage_state="/tmp/jeralis-audit-state.json",
        )
        page = context.new_page()
        page.goto(BASE + "/library", wait_until="domcontentloaded")
        page.get_by_role("button", name="New text").first.click()
        page.wait_for_timeout(400)
        capture(page, f"new-text-{size}.png")

        page.goto(BASE + BOOK, wait_until="domcontentloaded")
        page.wait_for_timeout(500)
        report[f"reader-before-{size}"] = sizes(page)
        page.get_by_text("Reading settings", exact=True).first.click()
        page.wait_for_timeout(250)
        report[f"reader-settings-{size}"] = sizes(page)
        capture(page, f"reading-settings-{size}.png")

        page.goto(BASE + BOOK, wait_until="domcontentloaded")
        page.locator(".reader-text").first.click()
        page.wait_for_timeout(400)
        capture(page, f"action-picker-{size}.png")

        page.goto(BASE + BOOK, wait_until="domcontentloaded")
        page.get_by_role("button", name="Reading appearance").click()
        page.wait_for_timeout(400)
        capture(page, f"appearance-{size}.png")

        page.goto(BASE + BOOK, wait_until="domcontentloaded")
        page.get_by_role("button", name="notes", exact=False).first.click()
        page.wait_for_timeout(400)
        capture(page, f"notes-{size}.png")
        context.close()
    browser.close()

(ROOT / "state_measurements.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
