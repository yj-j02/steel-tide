/* 닉네임(지휘관 이름) 욕설·성적 표현 차단.
   - 띄어쓰기·특수문자·숫자 끼워 넣기, 반복 글자, 숫자 대체(0→o 등), 한글 자판으로 친 영문(tlqkf 등)까지 걸러낸다.
   - 짧은 영어 단어(ass, sex 등)는 Cassandra·Essex 같은 이름이 걸리지 않게 단어 단위로만 본다.
   - 완벽한 필터는 아니다. 새 우회 표현이 보이면 아래 목록에 추가한다. */

const KO = [
  "시발", "씨발", "씨바", "씨빨", "시빨", "씌발", "쉬발", "싀발", "슈발", "쓰발", "ㅆ발", "c발", "씹", "좆", "존나", "졸라", "ㅈ같",
  "병신", "븅신", "빙신", "병싄", "개새끼", "개새기", "개색기", "개색끼", "개세끼", "새끼", "쌔끼", "미친놈", "미친년", "미친새",
  "지랄", "염병", "엠창", "느금마", "느금", "니애미", "니엄마", "애미", "에미", "엿먹", "닥쳐", "꺼져", "썅", "쌍놈", "쌍년",
  "섹스", "쎅스", "섹시", "야동", "보지", "자지", "잦이", "딸딸이", "자위", "성교", "강간", "윤간", "창녀", "창년", "걸레년", "보빨",
  "사까시", "펠라", "노콘", "질싸", "꼴리", "발기", "젖꼭지", "한남충", "김치녀", "틀딱", "일베충", "메갈",
  "ㅅㅂ", "ㅆㅂ", "ㅂㅅ", "ㅄ", "ㅈㄹ", "ㅈㄴ", "ㅅㅅ", "ㅗ",
];
/* 한글 자판으로 친 영문 · 영어 욕설 (부분 일치) */
const EN = [
  "tlqkf", "tlqk", "qudtls", "whssk", "rotoRl", "rotorl", "wlfkf", "tptmm", "wkwl", "qhwl",
  "fuck", "fuk", "fck", "fack", "fvck", "phuck", "shit", "bitch", "biatch", "cunt", "pussy", "porn", "sexy", "sexx", "nigg", "faggot",
  "whore", "slut", "penis", "vagina", "boob", "horny", "nude", "nsfw", "hentai", "milf", "dildo", "bastard", "asshole",
  "motherf", "jerkoff", "blowjob", "handjob", "rapist", "nazi", "hitler", "retard",
];
/* 짧아서 다른 이름에 섞이기 쉬운 단어: 단어 전체가 같을 때만 */
const EN_WORD = new Set(["ass", "dick", "cock", "sex", "rape", "cum", "tit", "tits", "fag", "anal", "damn", "piss", "wtf", "stfu"]);

const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s", "!": "i" };

const squash = (s) => s.replace(/(.)\1+/g, "$1"); /* fuuuuck → fuck */

/** 이름에 금지 표현이 있으면 true. */
export function isBadName(raw) {
  const s = String(raw || "").normalize("NFC").replace(/시발점|시발역/g, ""); /* 정상 단어 예외 */
  const low = s.toLowerCase();
  const plain = low.replace(/[\s\p{P}\p{S}_]/gu, ""); /* 띄어쓰기·기호 제거 */
  const koOnly = plain.replace(/[0-9a-z]/g, (ch) => (ch === "c" ? ch : "")); /* 시1발, 시a발 우회 */
  const leet = low.replace(/[0-9@$!]/g, (ch) => LEET[ch] ?? "").replace(/[\s\p{P}\p{S}_]/gu, "");
  const variants = new Set([plain, koOnly, leet, squash(plain), squash(leet), squash(koOnly), s.replace(/\s/g, "")]);
  for (const v of variants) {
    if (KO.some((w) => v.includes(w))) return true;
    if (EN.some((w) => v.includes(w.toLowerCase()) || v.includes(w))) return true;
  }
  const words = low.replace(/[0-9@$!]/g, (ch) => LEET[ch] ?? "").split(/[^a-z]+/).filter(Boolean);
  return words.some((w) => EN_WORD.has(w) || EN_WORD.has(squash(w)));
}

/** 다른 사람 이름을 표시할 때: 금지 표현이면 가린다. */
export const safeName = (name, fallback = "익명 지휘관") => (isBadName(name) ? fallback : name);
