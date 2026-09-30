from helpers import BASE_URL

def test_login_redirects_to_library(page):
    assert page.url.endswith("/library")

def test_public_landing_loads(page):
    page.goto(BASE_URL + "/")
    assert "Jeralis" in page.inner_text("body")
    assert "Read anything. Understand everything." in page.inner_text("body")

def test_no_page_errors(page):
    assert page._errors == []
