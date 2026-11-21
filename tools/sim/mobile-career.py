"""Run locally or set CAREER_TEST_URL. Pass webkit to test the Safari engine."""
import os
import subprocess
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get("CAREER_TEST_URL", "http://127.0.0.1:8952/")

def fits(page, selector):
    sizes = page.locator(selector).evaluate("e=>[e.clientWidth,e.scrollWidth]")
    assert sizes[1] <= sizes[0] + 1, (selector, sizes, page.locator(selector).evaluate("e=>[...e.querySelectorAll('*')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(n=>n.className)"))

def home(page):
    page.locator(".mobile-menu").tap()
    page.locator("#tabHQ").tap()

def check(page, nation):
    page.goto(URL)
    for key in (f"nat:{nation}", "svc:army", "br:inf", "enlist"):
        page.locator(f'[data-th="{key}"]').tap()
    desk = page.locator(".duty-overview")
    expect(desk).to_be_visible()
    fits(page,"#hqP")
    page.locator(".mobile-side").tap()
    expect(page.locator("#careerSide")).to_be_visible()
    page.locator(".mobile-side").tap()
    for turn in range(1,11):
        page.locator(f'[data-duty="ev:opening-inf-{turn}:0"]').tap()
        report = page.locator('[data-duty="rep:0"]:enabled')
        if report.count():
            report.tap()
        page.locator('[data-duty="next"]').tap()
    assert page.evaluate("async()=> (await import('./js/career.js')).career.cap") == 1
    page.locator('[data-pmgo="2"]').tap()
    if page.locator('[data-pmgo="3"]').is_visible():
        page.locator('[data-pmgo="3"]').tap()
    page.locator('#promoOk').tap()
    expect(desk).to_be_visible()
    print(nation, "enlistment to promotion passed", flush=True)
    page.reload()
    page.locator('[data-th^="play:"]').tap()
    expect(desk).to_be_visible()
    if nation == "kr":
        page.evaluate("""async()=>{
          const {potusStart}=await import('./js/potus.js');
          const {careerStorage}=await import('./js/characters.js');
          const {career,saveCareer}=await import('./js/career.js');
          career.minister=true;saveCareer();
          careerStorage.setItem('steeltide:mod',JSON.stringify({retired:true}));
          const state=potusStart('Test');state.crisis={id:'cyber'};
          careerStorage.setItem('steeltide:potus',JSON.stringify(state));
        }""")
        home(page)
        page.locator('[data-potus="min:0"]').tap()
        page.locator('[data-potus="nsc"]').tap()
        page.locator('#scene2d [data-a="0"]').tap()
        page.locator('#scene2d .s3-next.on').tap()
        page.locator('#scene2d .s3-next.on').tap()
        expect(page.locator("#scene2d")).to_have_count(0)
    else:
        page.evaluate("""async()=>{
          const {career,saveCareer}=await import('./js/career.js');
          const {careerStorage}=await import('./js/characters.js');
          const {newCareer}=await import('./js/us-career.js');
          const {electors}=await import('./js/content/us.js');
          const {ECON_RANK_XP}=await import('./js/shop.js');
          career.cap=9;career.discharged={g:9};saveCareer();window.__st.profile.xp=ECON_RANK_XP[9];
          careerStorage.setItem('steeltide:uspres',JSON.stringify({...newCareer(),phase:'campaign',party:'blue',journal:[]}));
        }""")
        home(page)
        page.locator('[data-map-action="state"]').select_option("CA")
        expect(page.locator('[data-uspres="c:0"]')).to_be_enabled()
        page.evaluate("""async()=>{
          const {careerStorage}=await import('./js/characters.js');
          const {electors}=await import('./js/content/us.js');
          const s=JSON.parse(careerStorage.getItem('steeltide:uspres'));
          careerStorage.setItem('steeltide:uspres',JSON.stringify({...s,phase:'night',results:electors}));
        }""")
        home(page)
        for title in ("미국 대통령 당선인","미국 대통령"):
            page.locator('[data-uspres="c:0"]').tap()
            expect(page.locator("#tbRank")).to_have_text(title)
            page.locator("#scene2d .s3-next").tap()
            if page.locator("#scene2d").count():
                page.locator("#scene2d .s3-skip").tap()
        page.locator('[data-map-action="th"]').select_option("europe")
        action=page.locator('[data-uspres="glob:europe:0"]')
        action.tap()
        expect(action).to_be_disabled()
    fits(page,"#hqP")
    print(nation, "presidency passed", flush=True)

def run():
    with sync_playwright() as pw:
        webkit="webkit" in sys.argv
        browser=pw.webkit.launch() if webkit else pw.chromium.launch(channel="chrome",args=["--enable-unsafe-swiftshader"])
        for nation in ("kr","us"):
            page=browser.new_page(viewport={"width":390 if webkit else 360,"height":800},has_touch=True,is_mobile=True)
            errors=[]
            page.on("pageerror",lambda error: errors.append(str(error)))
            page.set_default_timeout(9000)
            check(page,nation)
            assert not errors,errors
            page.close()
        browser.close()


if __name__ == "__main__":
    server = None if "CAREER_TEST_URL" in os.environ else subprocess.Popen(
        [sys.executable, str(Path(__file__).resolve().parents[1] / "serve.py"), "8952"])
    try:
        run()
    finally:
        if server:
            server.terminate()
            server.wait()
