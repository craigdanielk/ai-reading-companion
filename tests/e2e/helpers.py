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
    """The list pane renders asynchronously; wait for it before reading links."""
    page.wait_for_selector("a[href^='/book/']", timeout=20000)
    return page.eval_on_selector_all(
        "a[href^='/book/']",
        "els => els.length ? els[0].getAttribute('href') : None",
    )

def create_text(page, text, kind=None):
    """Capture a text through the sheet, the way a reader does."""
    page.get_by_role("button", name="New text").first.click()
    page.wait_for_selector('textarea[name="body_text"]', timeout=15000)
    if kind:
        page.click('button:has-text("' + kind + '")')
    page.fill('textarea[name="body_text"]', text)
    page.get_by_role("button", name="Understand", exact=True).click()
    page.wait_for_url("**/book/**", timeout=60000)
    m = re.search(r"/book/([0-9a-f-]{36})", page.url)
    if m:
        CREATED.append(m.group(1))

def cleanup_created(page):
    """Delete everything this run added, through the UI a reader would use."""
    for bid in list(CREATED):
        try:
            page.goto(BASE_URL + "/book/" + bid)
            page.wait_for_timeout(700)
            page.click("summary:has-text('Reading settings')")
            page.wait_for_timeout(300)
            page.click("summary:has-text('Book details')")
            page.wait_for_timeout(300)
            page.click("button:has-text('Delete this text')")
            page.wait_for_timeout(1200)
        except Exception:
            pass
    CREATED.clear()
