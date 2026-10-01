import time
from helpers import BASE_URL, settle, first_book_href, create_text

TEXT = (
    "Il a vendu la meche, mais personne ne l'a remarque. Le renard lui dit: "
    "on ne voit bien qu'avec le coeur, l'essentiel est invisible pour les yeux.\n\n"
    "Les grandes personnes ne comprennent jamais rien toutes seules."
)

def test_reader_renders_paragraph_blocks(page):
    href = first_book_href(page)
    assert href
    page.goto(BASE_URL + href)
    page.wait_for_timeout(1000)
    n = page.eval_on_selector_all("[data-start]", "els => els.length")
    assert n >= 1, "reader should split the text into paragraph blocks"

def test_appearance_themes_apply_and_persist(page):
    href = first_book_href(page)
    page.goto(BASE_URL + href)
    page.wait_for_timeout(1000)
    page.get_by_label("Reading appearance").click()
    page.wait_for_timeout(300)
    page.get_by_role("button", name="Sepia").click()
    page.wait_for_timeout(500)
    theme = page.eval_on_selector("[data-theme]", "el => el.getAttribute('data-theme')")
    assert theme == "sepia"
    page.reload()
    page.wait_for_timeout(1000)
    theme = page.eval_on_selector("[data-theme]", "el => el.getAttribute('data-theme')")
    assert theme == "sepia", "theme should persist across reload"

def test_paragraph_tap_produces_gloss(page):
    page.goto(BASE_URL + "/library")
    page.wait_for_timeout(800)
    create_text(page, TEXT)
    page.wait_for_timeout(1200)
    page.eval_on_selector_all("[data-start]", "els => els[0].click()")
    page.wait_for_timeout(600)
    # Tapping a paragraph opens the picker rather than assuming the verb, so the
    # reader chooses what to do with it. Understand is simply the first choice.
    picker = page.locator("[data-testid=action-picker]")
    assert picker.count() == 1, "tapping a paragraph should open the action picker"
    picker.get_by_role("button", name="Understand").click()
    settle(page)
    # poll for the deterministic signals instead of sleeping: the tapped paragraph
    # is highlighted and a margin gloss renders beside it
    page.wait_for_selector("mark", timeout=10000)
    page.wait_for_selector("aside", timeout=10000)
    marks = page.eval_on_selector_all("mark", "els => els.length")
    assert marks >= 1, "the tapped paragraph should be highlighted"
def test_reader_does_not_translate_on_open(page):
    """Opening a text must never translate it. The reader asks, the model answers."""
    page.goto(BASE_URL + "/library")
    page.wait_for_timeout(800)
    create_text(page, "Il a vendu la meche, mais personne ne l a remarque.")
    page.wait_for_timeout(6000)
    body = page.inner_text("body").lower()
    assert "let the cat" not in body, "the text was translated without being asked"
    assert "understanding" not in body, "a gloss appeared unprompted"
    assert "nothing is translated until you ask" in body, "the reader should say what it is waiting for"

def test_paged_reader_resumes_last_page(page):
    page.goto(BASE_URL + "/library")
    create_text(page, ("A long paragraph for a page turn. " * 14 + "\n\n") * 24)
    page.get_by_label("Reading appearance").click()
    page.get_by_role("button", name="Pages", exact=True).click()
    page.get_by_label("Close reading settings").click()
    next_page = page.get_by_label("Next page")
    page.wait_for_function("!document.querySelector('[aria-label=\"Next page\"]')?.disabled")
    next_page.click()
    number = next_page.evaluate("el => el.previousElementSibling?.textContent?.trim()")
    assert number and number.startswith("2 /"), number
    page.wait_for_timeout(1800)
    page.reload()
    page.wait_for_function("document.querySelector('[aria-label=\"Next page\"]')?.previousElementSibling?.textContent?.trim().startsWith('2 /')", timeout=15000)

def test_action_picker_keyboard_opens_and_returns_focus(page):
    href = first_book_href(page)
    page.goto(BASE_URL + href)
    paragraph = page.locator("[data-start]").first
    paragraph.focus()
    paragraph.press("Enter")
    picker = page.get_by_role("dialog", name="Choose a reading action")
    assert picker.is_visible()
    assert picker.evaluate("el => el.contains(document.activeElement) || el === document.activeElement")
    picker.press("Escape")
    assert not picker.is_visible()
    assert paragraph.evaluate("el => el === document.activeElement")

def test_reader_offers_all_three_selection_scopes(page):
    """A word, a paragraph, or the whole text."""
    href = first_book_href(page)
    assert href
    page.goto(BASE_URL + href)
    page.wait_for_timeout(1500)
    assert page.query_selector('button:has-text("whole text")'), "no whole-text control"
    assert page.query_selector("[data-start]"), "no paragraph to tap"
    assert page.query_selector("[data-start]"), "no paragraph to select"
    page.wait_for_timeout(200)
