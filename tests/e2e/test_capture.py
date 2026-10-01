from helpers import BASE_URL

def _open_sheet(page):
    page.goto(BASE_URL + "/library")
    page.wait_for_timeout(1200)
    page.get_by_role("button", name="New").first.click()
    page.get_by_role("dialog", name="Add to your library").get_by_role("button", name="Note").click()
    page.wait_for_selector('text=Scan or upload', timeout=15000)

def test_capture_offers_every_source(page):
    """A source must be reachable from the UI, not just present as a server action."""
    _open_sheet(page)
    for label in ("Type or paste", "Scan or upload", "Clipboard"):
        assert page.query_selector('button:has-text("' + label + '")'), label + " missing"

def test_scan_source_exposes_a_file_input(page):
    """The regression that mattered: upload actions existed while no UI called them."""
    _open_sheet(page)
    page.get_by_role("button", name="Scan or upload").click()
    page.wait_for_timeout(500)
    fi = page.query_selector('input[type="file"]')
    assert fi is not None, "no file input — a reader cannot upload a source"
    assert "image/" in (fi.get_attribute("accept") or ""), "file input should accept images"

def test_type_source_is_the_default(page):
    _open_sheet(page)
    assert page.query_selector('textarea[name="body_text"]') is not None
