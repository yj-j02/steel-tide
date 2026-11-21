"""Run from the repo root with Python Playwright, Chrome, and Node installed."""
from pathlib import Path
import subprocess
import sys
import time
from tempfile import TemporaryDirectory
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
URL = "http://127.0.0.1:8947"


def marshal(page, nation):
    wins = 4 if nation == "us" else 1
    page.evaluate("""async wins => {
      const {career,saveCareer}=await import("./js/career.js");
      const {ECON_RANK_XP}=await import("./js/shop.js");
      career.cap=9; career.marshalWins=wins; saveCareer();
      Object.assign(window.__st.profile,{xp:ECON_RANK_XP[9],admin:true});
    }""", wins)
    page.locator("#tabHQ").click()
    expect(page.locator(".desk-priority")).to_have_count(1)
    page.evaluate("document.activeElement.blur()")
    page.keyboard.press("Enter")
    assert page.evaluate("Boolean(document.activeElement.dataset.duty)")
    with TemporaryDirectory() as temp:
        for width, height in ((1280,720), (1600,900)):
            page.set_viewport_size({"width":width,"height":height})
            page.screenshot(path=str(Path(temp)/f"desk-{width}.png"))
            assert page.locator(".desk-priority").bounding_box()["width"] > 200
    button = page.locator('[data-duty="marshal"]')
    button.evaluate("b => { const d=b.closest('details'); if(d) d.open=true; }")
    button.click()
    hud = page.locator(".mw-hud")
    expect(hud).to_contain_text("97%" if wins > 3 else "89%")
    expect(hud).to_contain_text("30점" if wins > 3 else "10점")
    for _ in range(5):
        page.locator('.mw-btn[data-ci="0"]').click()
        page.locator("#mwNextBtn").click()
    page.locator("#mwFinishBtn").click()
    expect(page.locator("#promoM")).to_be_visible()
    assert page.evaluate("""async()=> (await import("./js/career.js")).career.cap""") == 10


def white_house(page):
    page.evaluate("""async()=> {
      const {career,saveCareer}=await import("./js/career.js");
      const {careerStorage}=await import("./js/characters.js");
      const {newCareer}=await import("./js/us-career.js");
      const {electors}=await import("./js/content/us.js");
      const {ECON_RANK_XP}=await import("./js/shop.js");
      window.__st.profile.xp=ECON_RANK_XP[9];
      career.cap=9; career.discharged={g:9,title:"Army Chief of Staff",date:"복무 24년차"};saveCareer();
      careerStorage.setItem("steeltide:uspres",JSON.stringify({...newCareer(),phase:"night",party:"blue",results:electors,journal:[]}));
    }""")
    page.locator("#tabHQ").click()
    for title in ("미국 대통령 당선인", "미국 대통령"):
        page.locator('[data-uspres="c:0"]').click()
        expect(page.locator("#tbRank")).to_have_text(title)
        page.locator("#scene2d .s3-skip").click()
    page.locator('[data-usth="europe"]').click()
    action = page.locator('[data-uspres="glob:europe:0"]')
    action.click()
    expect(action).to_be_disabled()


def browser_checks():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", args=["--enable-unsafe-swiftshader"])
        for nation in ("kr", "us"):
            for svc, branch in (("army","inf"), ("navy","sea"), ("air","plt")):
                page = browser.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.add_init_script("const raf=window.requestAnimationFrame.bind(window); window.requestAnimationFrame=cb=>cb.name==='loop'?0:raf(cb)")
                page.goto(URL)
                for value in (f"nat:{nation}", f"svc:{svc}", f"br:{branch}", "enlist"):
                    page.locator(f'[data-th="{value}"]').click()
                page.locator(".duty-overview").wait_for()
                page.locator("#tabRecord").click()
                portrait = page.locator("#recordP .mi-por-ceremonial")
                expect(portrait).to_be_visible()
                expect(portrait.locator(".portrait-service-emblem")).to_have_attribute("href",f"img/service-emblems/{nation}-{svc}.png")
                assert page.evaluate("async path => (await createImageBitmap(await (await fetch(path)).blob())).width > 0", f"img/service-emblems/{nation}-{svc}.png")
                if svc == "army":
                    marshal(page, nation)
                if nation == "us" and svc == "air":
                    white_house(page)
                assert not errors, errors
                print(nation, svc, "passed", flush=True)
                page.close()
        browser.close()


if __name__ == "__main__":
    for test in sorted((ROOT / "tools/sim").glob("*.mjs")):
        subprocess.run(["node",str(test)], cwd=ROOT,check=True)
    server = subprocess.Popen([sys.executable,"tools/serve.py","8947"], cwd=ROOT)
    try:
        for attempt in range(60):
            if server.poll() is not None:
                raise RuntimeError("test server exited")
            try:
                with urlopen(URL, timeout=1):
                    break
            except OSError:
                time.sleep(.1)
        browser_checks()
    finally:
        server.terminate()
        server.wait()
