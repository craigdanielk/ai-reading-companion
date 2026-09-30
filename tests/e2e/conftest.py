import pytest
from playwright.sync_api import sync_playwright
from helpers import BASE_URL

@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()

@pytest.fixture
def page(browser):
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)[:200]))
    pg.goto(BASE_URL + "/login")
    pg.get_by_role("button", name="Continue as demo user").click()
    pg.wait_for_url("**/library", timeout=30000)
    pg._errors = errors
    yield pg
    ctx.close()
