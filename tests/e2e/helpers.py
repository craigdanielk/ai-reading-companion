import os
import re

BASE_URL = os.environ.get("JERALIS_URL", "https://ai-reading-companion-alpha.vercel.app")

# Texts created by a run. The library is the demo the client looks at, so a suite
# that pollutes it is a suite that lies about the product.
CREATED: list[str] = []

def settle(page, timeout=120000):
    """Wait for any in-flight understand stream to finish (Stop button detaches)."""
    try:
        page.wait_for_selector("text=Stop", timeout=3000)
    except Exception:
        pass
    try:
        page.wait_for_selector("text=Stop", state="detached", timeout=timeout)
    except Exception:
        pass

def first_book_href(page):
    """Wait for a shelf link before reading the first text."""
    page.wait_for_selector("a[href^='/book/']", timeout=20000)
    return page.eval_on_selector_all(
        "a[href^='/book/']",
        "els => els.length ? els[0].getAttribute('href') : None",
    )

def create_text(page, text, kind=None):
    """Capture a text through the sheet, the way a reader does."""
    page.get_by_role("button", name="New").first.click()
    page.get_by_role("dialog", name="Add to your library").get_by_role("button", name=kind or "Note").click()
    page.wait_for_selector('textarea[name="body_text"]', timeout=15000)
    page.fill('textarea[name="body_text"]', text)
    page.get_by_role("button", name="Add to library").click()
    page.wait_for_url("**/book/**", timeout=60000)
    m = re.search(r"/book/([0-9a-f-]{36})", page.url)
    if m:
        CREATED.append(m.group(1))

def cleanup_created(page):
    """Delete everything this run added, through the UI a reader would use."""
    failures = []
    for bid in list(CREATED):
        try:
            page.goto(BASE_URL + "/book/" + bid)
            page.wait_for_timeout(900)
            page.get_by_role("button", name="Text options").click()
            page.evaluate("document.querySelectorAll('details').forEach(d => { d.open = true })")
            page.wait_for_timeout(400)
            page.once("dialog", lambda dialog: dialog.accept())
            page.get_by_role("button", name="Delete this text and everything read in it").click()
            page.wait_for_url("**/library*", timeout=15000)
        except Exception as e:
            failures.append(bid + ": " + str(e)[:160])
    CREATED.clear()
    if failures:
        raise RuntimeError("CLEANUP FAILED: " + "; ".join(failures))
