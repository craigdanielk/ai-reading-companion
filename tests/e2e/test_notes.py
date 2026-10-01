import re
import uuid
from helpers import BASE_URL, first_book_href

NOTE = "e2e note that must not survive"


def _open_notes(page):
    page.get_by_role("button", name=re.compile(r"^notes(?: \(\d+\))?$" )).click()
    page.wait_for_timeout(800)


def test_a_personal_note_can_be_written_edited_and_deleted(page):
    note = NOTE + " " + uuid.uuid4().hex[:8]
    href = first_book_href(page)
    assert href
    page.goto(BASE_URL + href)
    page.wait_for_timeout(1600)

    # Write.
    _open_notes(page)
    page.locator('textarea[name="body"]:visible').last.fill(note)
    page.get_by_role("button", name="Save note").click()
    page.wait_for_timeout(3000)
    page.goto(BASE_URL + "/saved")
    assert note in page.inner_text("body"), "personal note should appear in Saved history"
    page.locator("a", has_text=note).first.click()
    page.wait_for_url("**/book/**", timeout=15000)
    _open_notes(page)
    assert note in page.inner_text("body")
    assert page.query_selector('summary:has-text("edit")'), "a note should be editable"

    # Delete. Scope to the note's own list item: a bare name="delete" also
    # substring-matches the header's "Delete this text ..." form button.
    item = page.locator("li", has_text=note).first
    page.once("dialog", lambda dialog: dialog.accept())
    item.get_by_role("button", name="delete", exact=True).click()
    page.wait_for_timeout(3000)

    # A new server-rendered history request proves deletion against the database.
    if page.url.endswith("/login"):
        page.get_by_role("button", name="Continue as demo user").click()
        page.wait_for_url("**/library", timeout=15000)
    else:
        close = page.get_by_role("button", name="Close", exact=True)
        if close.count():
            close.last.click()
    page.goto(BASE_URL + "/saved")
    assert note not in page.inner_text("body")
