from helpers import BASE_URL

def test_operator_console_renders_for_the_admin(page):
    page.goto(BASE_URL + "/admin")
    page.wait_for_timeout(2500)
    body = page.inner_text("body")
    assert "Operations" in body
    assert "Readers never see cost" in body
    for panel in ("LAST 24H", "WHO PAID", "BY MODEL"):
        assert panel in body, panel + " missing from the console"

def test_console_offers_invite_and_reset(page):
    page.goto(BASE_URL + "/admin")
    page.wait_for_timeout(2000)
    body = page.inner_text("body")
    assert "Invite a reader" in body
    assert "Reset a password" in body

def test_readers_never_see_cost(page):
    """Cost is the operator margin. It must not appear anywhere a reader goes."""
    for path in ("/library", "/saved", "/settings", "/settings/account", "/settings/providers"):
        page.goto(BASE_URL + path)
        page.wait_for_timeout(900)
        body = page.inner_text("body").lower()
        for word in ("cost", "spend", "billing", "usd", "$0."):
            assert word not in body, word + " leaked into " + path
