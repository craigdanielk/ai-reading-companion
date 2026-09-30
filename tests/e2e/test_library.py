from helpers import BASE_URL, first_book_href

def test_shelf_renders_books(page):
    page.goto(BASE_URL + "/library")
    page.wait_for_timeout(800)
    href = first_book_href(page)
    assert href is not None, "expected at least one book on the shelf"

def test_shelf_no_horizontal_overflow(page):
    page.goto(BASE_URL + "/library")
    page.wait_for_timeout(500)
    sw = page.evaluate("() => document.documentElement.scrollWidth")
    assert sw <= page.viewport_size["width"] + 1
