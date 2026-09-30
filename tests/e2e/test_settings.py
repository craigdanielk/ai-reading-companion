from helpers import BASE_URL

def test_settings_pages_render(page):
    for path in ("/settings", "/settings/preferences", "/settings/providers", "/settings/account", "/privacy"):
        page.goto(BASE_URL + path)
        page.wait_for_timeout(400)
        assert page.inner_text("body").strip() != "", path + " rendered empty"
