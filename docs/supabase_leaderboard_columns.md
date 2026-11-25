# 글로벌 랭킹 — 심사 평균·도달 연차 등이 "—"로 보일 때

## 증상

랭킹 표에서 **심사 평균 · 도달 연차 · 지지율 · 하드코어 · 보직** 칸이 비어("—") 보인다.

## 원인 (가장 유력, 라이브 서버에서 직접 확인하지는 못함) [신뢰도 보통 — 확인 필요]

`app/public/js/online-board.js`는 기록을 저장할 때 먼저 전체 정보(`post_name`, `board_avg`, `promo_week`, `approval`, `hardcore` 포함)를 보낸다.
Supabase `leaderboard` 표에 이 칸들이 없으면 저장이 실패하고, 코드는 **기본 정보만**(이름·계급·XP·전적·훈장·결말·장) 다시 저장한다.
그래서 순위는 보이지만 위 칸들은 비게 된다. 실패하면 브라우저 콘솔에 `[leaderboard] 전체 정보 저장 실패` 경고가 찍힌다.

## 해결 (Supabase 대시보드 → SQL Editor에서 한 번 실행)

이 변경은 DB 구조를 바꾸므로 대시보드 권한이 있는 사람이 직접 실행해야 한다.

```sql
alter table public.leaderboard
  add column if not exists post_name   text,
  add column if not exists board_avg   numeric,
  add column if not exists promo_week  integer,
  add column if not exists approval    integer,
  add column if not exists hardcore    boolean default false;

notify pgrst, 'reload schema';
```

- 마지막 줄은 API가 새 칸을 바로 인식하게 하는 명령이다.
- 실행 후 게임에서 랭킹 탭을 열면(또는 "동기화" 버튼) 내 기록이 전체 정보로 다시 저장된다. 다른 사람 기록은 그 사람이 다음에 접속해야 채워진다.

## 칸이 있어도 비어 보이는 정상 경우

- **심사 평균**은 정기 진급심사 점수의 평균이고 **자동진급(소위→중위→대위)은 제외**한다. 대위 이하 캐릭터는 심사 기록이 없어 "—"이다.
- **도달 연차**는 현재 계급에 오른 시점으로 계산한다.
- 쉬운 모드(첫 접속)로 진행한 캐릭터는 랭킹에 올라가지 않는다.


## 추가: 다른 플레이어의 루트(병과·임관 구분·전역 진로) 표시

랭킹 이름 아래 "🧭 임관구분 | 병과 → 병과 | 전역: 진로" 한 줄이 보이려면 칸 하나가 더 필요하다. 칸이 없어도 게임은 정상 동작하며 이 줄만 안 보인다.

```sql
alter table public.leaderboard
  add column if not exists route_info text;

notify pgrst, 'reload schema';
```
