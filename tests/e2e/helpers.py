import os

BASE_URL = os.environ.get("JERALIS_URL", "https://ai-reading-companion-alpha.vercel.app")

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
    return page.eval_on_selector_all(
        "a[href^='/book/']",
        "els => els.length ? els[0].getAttribute('href') : None",
    )
