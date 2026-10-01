from helpers import BASE_URL, first_book_href

def test_saved_history_groups_by_text_kind_and_newest_date(page):
    page.goto(BASE_URL + "/saved")
    groups = page.locator("main section")
    assert groups.count() >= 1
    newest_by_group = []
    for group in groups.all():
        assert group.locator("h2").inner_text().strip()
        dates = group.locator("time[datetime]").evaluate_all("els => els.map(el => el.dateTime)")
        assert dates == sorted(dates, reverse=True), "entries within a text kind must be newest first"
        if dates:
            newest_by_group.append(dates[0])
    assert newest_by_group == sorted(newest_by_group, reverse=True), "most recently active text kind should be first"

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
