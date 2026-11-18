#!/usr/bin/env python3
"""Steel Tide — Korean radio voice lines with the Typecast TTS API.

Run on your own PC (the key stays with you; never put it in the game or the repo):
    set TYPECAST_API_KEY=...            (Windows)   /   export TYPECAST_API_KEY=...   (mac/Linux)
    python tools/typecast_tts.py --list            # Korean-capable male voices to pick from (preview them in Typecast)
    python tools/typecast_tts.py --voice tc_xxxx   # writes app/public/sfx/radio_ko/*.mp3 + index.json
Python 3.8+, standard library only.
"""
import argparse, json, os, sys, time, urllib.request, urllib.error

API = "https://api.typecast.ai"
# Attribution required by Typecast: integration source + the coding agent that generated this file.
UA = "typecast-direct/1 python-urllib typecast-integration/1 (source=api-page; generated_by=claude)"
_REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "public", "sfx")
OUT = os.path.join(_REPO, "radio_ko") if os.path.isdir(_REPO) else os.path.join(os.getcwd(), "steeltide_radio_ko")  # outside the repo: a folder next to you, send the mp3 files back

# key -> (line, emotion preset). The subtitle in game adds how the crew address you (사관님 / 함장님 / 제독님 ...).
LINES = {
    "battle": ("전투 배치 완료!", "toneup"),
    "sunk": ("적함 격침 확인!", "happy"),
    "torp_warn": ("어뢰 접근 중입니다! 회피 기동!", "angry"),
    "ally_sunk": ("아군 함정 침몰했습니다!", "sad"),
    "launch": ("전투기 출격합니다!", "toneup"),
    "return": ("전투기 귀환했습니다.", "normal"),
    "fire": ("함내 화재 발생!", "angry"),
    "flood": ("침수 발생! 손상통제반 투입!", "angry"),
    "hull": ("선체 손상 심각합니다!", "sad"),
    "torp_launch": ("어뢰 발사 완료!", "normal"),
    "fleet": ("적 함대 전멸했습니다!", "happy"),
    "abandon": ("총원 퇴함!", "sad"),
    "promo": ("사관님, 진급을 축하드립니다!", "happy"),
}

def req(method, path, key, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(API + path, data=data, method=method, headers={"X-API-KEY": key, "User-Agent": UA, "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return resp.read()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="list ssfm-v31 male voices")
    ap.add_argument("--voice", help="voice_id (tc_... or uc_...)")
    ap.add_argument("--only", help="comma-separated keys to (re)generate")
    a = ap.parse_args()
    key = os.environ.get("TYPECAST_API_KEY")
    if not key: sys.exit("TYPECAST_API_KEY 환경변수를 먼저 설정하세요.")
    try:
        if a.list or not a.voice:
            vs = json.loads(req("GET", "/v3/voices?model=ssfm-v31&gender=male", key))
            vs = vs.get("voices", vs) if isinstance(vs, dict) else vs
            for v in vs[:60]: print(v.get("voice_id"), "|", v.get("voice_name") or v.get("name"), "|", v.get("age") or "", v.get("use_cases") or "")
            print("\n위 목록(또는 Typecast 웹의 API 보이스 라이브러리)에서 한국어 남성 음성을 골라 --voice 로 넘기세요.")
            return
        os.makedirs(OUT, exist_ok=True)
        keys = a.only.split(",") if a.only else list(LINES)
        done = []
        for k in keys:
            text, emo = LINES[k]
            body = {"model": "ssfm-v31", "voice_id": a.voice, "text": text, "language": "kor",
                    "prompt": {"emotion_type": "preset", "emotion_preset": emo, "emotion_intensity": 1.2},
                    "output": {"audio_format": "mp3", "audio_tempo": 1.08, "target_lufs": -16}}
            audio = req("POST", "/v1/text-to-speech", key, body)
            with open(os.path.join(OUT, f"{k}.mp3"), "wb") as f: f.write(audio)
            print(f"ok  {k}.mp3  ({len(audio) // 1024} KB)  {text}"); done.append(k); time.sleep(0.4)
        have = sorted(set(done) | {f[:-4] for f in os.listdir(OUT) if f.endswith(".mp3")})
        with open(os.path.join(OUT, "index.json"), "w") as f: json.dump(have, f)
        print(f"\n{len(done)}개 생성 → {os.path.normpath(OUT)}  (게임은 index.json에 있는 한국어 음성을 우선 사용)")
    except urllib.error.HTTPError as e:
        sys.exit(f"Typecast API 오류 {e.code}: {e.read()[:300]!r}  (401 키 확인 · 402 크레딧 부족 · 404 voice_id 확인)")

if __name__ == "__main__":
    main()
