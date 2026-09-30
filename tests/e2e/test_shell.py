from helpers import BASE_URL, first_book_href

def test_rail_lists_kinds_and_global_saved(page):
    page.goto(BASE_URL + "/library")
    page.wait_for_timeout(1200)
    rail = page.eval_on_selector_all("aside nav a", "els => els.map(e => e.getAttribute('href'))")
    assert "/library" in rail
    assert "/saved" in rail

def test_kind_bucket_filters_the_shelf(page):
    page.goto(BASE_URL + "/library?kind=book")
    page.wait_for_timeout(1200)
    assert page.eval_on_selector_all("h1", "els => els.map(e => e.textContent.trim())")[0] == "Books"

def test_list_pane_persists_into_the_reader(page):
    href = first_book_href(page)
    assert href
    page.goto(BASE_URL + href)
    page.wait_for_timeout(1500)
    heading = page.eval_on_selector_all("h2", "els => els.map(e => e.textContent.trim())")
    assert "All texts" in heading

def test_capture_sheet_offers_every_kind(page):
    page.goto(BASE_URL + "/library")
    page.wait_for_timeout(1000)
    page.get_by_role("button", name="New text").first.click()
    page.wait_for_timeout(600)
    for label in ("Book", "Paper", "Article", "Essay", "Poem", "Note", "Other"):
        assert page.query_selector('button:has-text("' + label + '")'), label + " missing from the capture sheet"
