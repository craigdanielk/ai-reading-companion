from helpers import BASE_URL

def test_search_finds_text_inside_a_body(page):
    """Searching for a half-remembered passage, not just a title."""
    page.goto(BASE_URL + "/library?q=renard")
    page.wait_for_timeout(2000)
    body = page.inner_text("body")
    assert "Results for" in body
    assert "Inside the texts" in body

def test_search_with_no_matches_says_so(page):
    page.goto(BASE_URL + "/library?q=zzzznothing")
    page.wait_for_timeout(2000)
    assert "Nothing matches" in page.inner_text("body")
