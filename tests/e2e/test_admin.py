"""The operator console is gated by ADMIN_EMAILS. The suite signs in as a reader.

The demo account is deliberately NOT the operator. The public "Continue as demo
user" button must never hand out cost, margin or the reader list, so the reader
invariant is asserted with the demo account and the console itself is only
exercised when the operator supplies their own credentials:

    JERALIS_OPERATOR_EMAIL=... JERALIS_OPERATOR_PASSWORD=... pytest tests/e2e
"""
import os

import pytest

from helpers import BASE_URL

OPERATOR_EMAIL = os.environ.get("JERALIS_OPERATOR_EMAIL")
OPERATOR_PASSWORD = os.environ.get("JERALIS_OPERATOR_PASSWORD")

needs_operator = pytest.mark.skipif(
    not (OPERATOR_EMAIL and OPERATOR_PASSWORD),
    reason="set JERALIS_OPERATOR_EMAIL and JERALIS_OPERATOR_PASSWORD to exercise the console",
)


def sign_in_as_operator(page):
    page.goto(BASE_URL + "/login")
    page.wait_for_timeout(900)
    # The fixture already signed in as the reader; drop that session first.
    signout = page.query_selector("button:has-text('Sign out')")
    if signout:
        signout.click()
        page.wait_for_timeout(1500)
    page.fill("input[type=email]", OPERATOR_EMAIL)
    page.fill("input[type=password]", OPERATOR_PASSWORD)
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_timeout(5000)


def test_the_demo_account_is_not_the_operator(page):
    """Anyone can click the demo button. It must not be the way into the console."""
    page.goto(BASE_URL + "/admin")
    page.wait_for_timeout(2500)
    assert "/admin" not in page.url, "the one-click demo account reached the operator console"
    assert page.url.endswith("/library"), "a reader should land back on the library"
    body = page.inner_text("body").lower()
    for word in ("last 24h", "who paid", "by model"):
        assert word not in body, "console panel leaked to a reader: " + word


@needs_operator
def test_operator_console_renders_for_the_operator(page):
    sign_in_as_operator(page)
    page.goto(BASE_URL + "/admin")
    page.wait_for_timeout(2500)
    body = page.inner_text("body")
    assert "Operations" in body
    assert "Readers never see cost" in body
    for panel in ("LAST 24H", "WHO PAID", "BY MODEL"):
        assert panel in body, panel + " missing from the console"


@needs_operator
def test_console_offers_invite_and_reset(page):
    sign_in_as_operator(page)
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


def test_readers_are_not_offered_the_console(page):
    page.goto(BASE_URL + "/settings")
    page.wait_for_timeout(1200)
    assert "/admin" not in page.content(), "/settings links the operator console to a reader"
