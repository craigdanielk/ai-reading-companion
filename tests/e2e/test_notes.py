from helpers import BASE_URL, first_book_href

NOTE = "e2e note that must not survive"


def _open_notes(page):
    page.get_by_role("button", name="notes").first.click()
    page.wait_for_timeout(800)


def test_a_personal_note_can_be_written_edited_and_deleted(page):
    href = first_book_href(page)
    assert href
    page.goto(BASE_URL + href)
    page.wait_for_timeout(1600)

    # Write.
    _open_notes(page)
    page.fill('textarea[name="body"]', NOTE)
    page.get_by_role("button", name="Save note").click()
    page.wait_for_timeout(3000)
    _open_notes(page)
    assert NOTE in page.inner_text("body")
    assert page.query_selector('summary:has-text("edit")'), "a note should be editable"

    # Delete. Scope to the note's own list item: a bare name="delete" also
    # substring-matches the header's "Delete this text ..." form button.
    item = page.locator("li", has_text=NOTE).first
    item.get_by_role("button", name="delete", exact=True).click()
    page.wait_for_timeout(3000)

    # Reload so the absence is proven against the database, not the DOM.
    page.reload()
    page.wait_for_timeout(1600)
    _open_notes(page)
    assert NOTE not in page.inner_text("body")