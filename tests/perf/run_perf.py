#!/usr/bin/env python3
"""Load-time and API-latency probe. Exit 1 if any threshold is breached.
Usage: python tests/perf/run_perf.py [--base URL] [--understand]"""

import argparse, json, time
from playwright.sync_api import sync_playwright

BASE_URL = "https://ai-reading-companion-alpha.vercel.app"

THRESHOLDS = {
    "login_load_ms": 3000,
    "library_load_ms": 4000,
    "book_load_ms": 5000,
    "understand_first_byte_ms": 15000,
}

def nav_timings(page, url):
    page.goto(url, wait_until="load")
    page.wait_for_timeout(300)
    return page.evaluate("() => { const n = performance.getEntriesByType('navigation')[0]; return { ttfb: Math.round(n.responseStart - n.requestStart), domContentLoaded: Math.round(n.domContentLoadedEventEnd - n.requestStart), load: Math.round(n.loadEventEnd - n.requestStart) }; }")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=BASE_URL)
    ap.add_argument("--understand", action="store_true", help="also time the understand API (spends a model call)")
    args = ap.parse_args()

    results = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1280, "height": 900})
        pg = ctx.new_page()
        results["login"] = nav_timings(pg, args.base + "/login")
        pg.get_by_role("button", name="Continue as demo user").click()
        pg.wait_for_url("**/library", timeout=30000)
        results["library"] = nav_timings(pg, args.base + "/library")
        href = pg.eval_on_selector_all("a[href^='/book/']", "els => els[0].getAttribute('href')")
        if href:
            results["book"] = nav_timings(pg, args.base + href)
        if args.understand:
            pg.eval_on_selector_all("[data-start]", "els => els[0].click()")
            t0 = time.time()
            pg.wait_for_selector("text=YOUR UNDERSTANDING", timeout=120000)
            results["understand_first_byte_ms"] = round((time.time() - t0) * 1000)
        b.close()

    print(json.dumps(results, indent=2))
    breaches = []
    for key, limit in THRESHOLDS.items():
        if key in results:
            actual = results[key]["load"] if isinstance(results[key], dict) else results[key]
            if actual > limit:
                breaches.append("%s=%dms > %dms" % (key, actual, limit))
    if breaches:
        print("THRESHOLD BREACHES:", "; ".join(breaches))
        raise SystemExit(1)
    print("all measured thresholds clear")

if __name__ == "__main__":
    main()
