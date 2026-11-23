# THE GENERAL (Steel Tide)

**🇰🇷 대한민국 국군 & 🇺🇸 미합중국군 3군(육·해·공) 장교 커리어 · 국방 경영 · 3D 해전 시뮬레이션**

> **설치 없이 브라우저에서 바로 플레이:**
> 👉 **[https://yj-j02.github.io/steel-tide/](https://yj-j02.github.io/steel-tide/)**

---

## 주요 특징

- **🎖️ 소위(O-1)에서 원수(5성) · 국방부장관 · 대통령까지**
  - 임관(사관학교·학사/ROTC·3사관)부터 계급별 보직, 정기 진급심사, 청문회, 합동 워룸, 전시 총력전(5성 원수), 국방부장관(펜타곤 SecDef), 대선·대통령 국정운영까지 이어지는 풀 커리어 시뮬레이션
- **🇰🇷 한국군 / 🇺🇸 미군 듀얼 모드 & 10인 명예의 전당**
  - 한국군·미군 계급장, 정복 초상화, 병과 트랙, 전역 후 제2의 인생(방산·항공사·싱크탱크·사이버보안 등) 및 가문 승계
- **🎭 라이브 캐릭터 & 🎙️ 65종 풀 보이스 나레이션**
  - 호흡·눈 깜빡임·립싱크·2단 관절 거수경례를 지원하는 SVG 라이브 캐릭터와 주요 결재·취임·청문회 음성 나레이션(상단 원클릭 ON/OFF 지원)
  - 국방부장관·대통령 취임 시 직접 그리는 투명 서명 도장 시스템
- **🌐 실시간 동접자 · 글로벌 랭킹 & 🔥 하드코어 모드**
  - Supabase 기반 실시간 접속자 현황 및 부문별 랭킹 경쟁(종합 · 진급심사 평균 · 최단 연차 · 대통령 지지율 · 훈장 · 하드코어 전용)
- **⚓ 3D 전투체험 & 2D 작전지도 (Three.js r170)**
  - 현대전 미사일·이지스 방공·함재기 조종·서해 72시간 캠페인 등 브라우저 3D 전투 및 FM 작전 지휘

---

## 로컬 실행 (Local Development)

```bash
python tools/serve.py 8820
```

실행 후 `http://localhost:8820` 으로 접속하세요. (테스트 실행: `node tools/sim/smoke-all.mjs`)

---

## 프로젝트 구조 (`app/public`)

| 파일 / 폴더 | 설명 |
|---|---|
| `index.html` | 전체 UI 패널, 스타일, 설정 모달 |
| `client.js` | 게임 루프, 커리어/집무실/인사기록/3D 전투 UI |
| `js/duty.js`, `js/promotion-board.js` | 복무 안건, 위기 대응, 정기 진급심사 |
| `js/service-rules.js`, `js/service-calendar.js` | 한·미 임관/의무복무/장기복무/계급정년 규칙 |
| `js/ministry.js`, `js/pres.js`, `js/potus.js` | 국방부장관·대선·대통령 국정운영 |
| `js/live-actor.js`, `js/signature-pad.js` | 라이브 SVG 캐릭터 애니메이션, 자필 서명 패드 |
| `js/online-board.js` | Supabase 실시간 동접자 및 글로벌 랭킹 |
| `js/audio.js`, `sfx/vo/` | Web Audio 사운드 및 65종 음성 나레이션 |
| `js/core.js`, `js/ships.js`, `js/modern.js`, `js/ops.js` | Three.js 3D 해전·항공전·작전 엔진 |
