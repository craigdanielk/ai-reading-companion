from helpers import BASE_URL, first_book_href

def test_notes_page_renders_and_deep_links(page):
    href = first_book_href(page)
    assert href
    bid = href.replace("/book/", "")
    page.goto(BASE_URL + "/book/" + bid + "/notes")
    page.wait_for_timeout(900)
    assert "Saved" in page.inner_text("body")
    links = page.query_selector_all("a[href*='&at=']")
    if links:
        target = links[0].get_attribute("href")
        links[0].click()
        page.wait_for_url("**/book/**", timeout=30000)
        # the ring appears once the reader has hydrated and run its focus effect
        page.wait_for_selector('[data-block][class*="ring-"]', timeout=10000)
        rings = page.eval_on_selector_all("[data-block]", "els => els.filter(e => e.className.includes('ring-')).length")
        assert rings == 1, "the deep-linked paragraph should be ringed"
