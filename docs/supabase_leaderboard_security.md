# 글로벌 랭킹(Supabase) 보안 점검 메모

## 현재 구조

- `app/public/js/online-board.js`가 브라우저에서 공개용 키(`sb_publishable_…`)로 `leaderboard` 테이블에 직접 `upsert`한다.
- 공개용 키는 원래 브라우저에 노출되어도 되는 키다. 대신 **테이블 쓰기 권한은 Supabase의 RLS(Row Level Security) 정책으로 막아야** 한다.
- 이 저장소에서는 Supabase 대시보드 설정을 볼 수 없어서, RLS가 켜져 있는지 확인하지 못했다. [신뢰도 낮음 — 사용 전 확인 필수]

## RLS가 꺼져 있거나 "누구나 쓰기" 정책이면 생기는 일

- 브라우저 개발자 도구로 아무 `player_id`의 점수·계급·이름을 덮어쓸 수 있다.
- 다른 사람의 행을 지우거나 이름을 바꿀 수 있다 (정책에 따라).

## 확인 방법 (Supabase 대시보드)

1. Table Editor → `leaderboard` → 상단에 "RLS enabled" 표시가 있는지 본다.
2. Authentication → Policies → `leaderboard`에 어떤 정책이 있는지 본다.

## 권장 설정 (적용 전 Supabase 공식 문서로 확인)

- **익명 로그인(Anonymous Sign-ins)** 을 켜고, 브라우저에서 `supabase.auth.signInAnonymously()`로 사용자 ID를 받는다.
- 테이블에 `owner uuid default auth.uid()` 열을 추가한다.
- 정책:
  - 읽기: 누구나 (`select` → `true`)
  - 추가: `auth.uid() = owner`
  - 수정: `auth.uid() = owner` (자기 행만)
  - 삭제: 허용하지 않음
- 값 범위 체크 제약(예: `grade between 0 and 12`, `xp >= 0`)을 걸어 터무니없는 점수를 막는다.
- 이렇게 해도 "자기 점수를 부풀리는 것"까지는 완전히 막을 수 없다. 완전히 막으려면 점수 계산을 서버(Edge Function)에서 검증해야 한다.

위 SQL·정책은 아직 적용하지 않았다. 대시보드 권한이 있는 사람이 확인 후 적용해야 한다.
