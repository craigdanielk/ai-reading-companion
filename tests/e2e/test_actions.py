"""The reader chooses the verb, and the language, at the moment of asking."""
from helpers import BASE_URL, first_book_href, settle


def select_in_first_paragraph(page, start=0, end=7):
    """Make a real selection and let the reader notice it."""
    page.evaluate(
        """([s, e]) => {
          const p = document.querySelector('[data-start]');
          // The paragraph renders its text inside spans, so walk to a text node.
          const node = document.createTreeWalker(p, NodeFilter.SHOW_TEXT).nextNode();
          const r = document.createRange();
          r.setStart(node, s);
          r.setEnd(node, e);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
          p.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        }""",
        [start, end],
    )
    page.wait_for_timeout(600)


def test_a_selection_offers_the_verbs_for_what_was_selected(page):
    href = first_book_href(page)
    assert href
    page.goto(BASE_URL + href)
    page.wait_for_timeout(1500)
    select_in_first_paragraph(page, 0, 7)
    picker = page.locator("[data-testid=action-picker]")
    assert picker.count() == 1, "selecting text should open the picker"
    labels = picker.inner_text()
    for verb in ("Understand", "Translate", "Grammar", "Define"):
        assert verb in labels, verb + " missing for a short selection"
    # A whole-text verb has no business on a seven-character selection.
    assert "Summarise" not in labels


def test_the_target_language_is_chosen_while_reading(page):
    """The language used to be frozen when the text was filed. Now it is asked."""
    href = first_book_href(page)
    assert href
    sent = []
    page.on(
        "request",
        lambda r: sent.append(r.post_data)
        if "/api/understand" in r.url and r.post_data
        else None,
    )
    page.goto(BASE_URL + href)
    page.wait_for_timeout(1500)
    select_in_first_paragraph(page, 0, 7)
    picker = page.locator("[data-testid=action-picker]")
    assert picker.count() == 1
    # Open the language control and ask for Spanish.
    picker.get_by_role("button", name="Into").click()
    page.wait_for_timeout(300)
    picker.get_by_role("button", name="Spanish").click()
    page.wait_for_timeout(300)
    picker.get_by_role("button", name="Translate").click()
    settle(page)
    assert sent, "no request reached the comprehension endpoint"
    body = sent[-1]
    assert '"action":"translate"' in body, "the action was not carried: " + body[:200]
    assert '"target_language":"es"' in body, "the chosen language was not carried: " + body[:200]


def test_the_whole_text_offers_only_the_verbs_that_make_sense(page):
    href = first_book_href(page)
    assert href
    page.goto(BASE_URL + href)
    page.wait_for_timeout(1500)
    page.locator("[data-testid=whole-text-action]").first.click()
    page.wait_for_timeout(500)
    menu = page.locator("[data-testid=action-menu]")
    assert menu.count() == 1, "the whole-text control should open the menu"
    labels = menu.inner_text()
    for verb in ("Understand", "Summarise", "Hard parts"):
        assert verb in labels, verb + " missing for a whole text"
    # Translating an entire book is not something a reader wants offered.
    assert "Translate" not in labels
    assert "Define" not in labels
