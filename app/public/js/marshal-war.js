/**
 * 전시 원수(5성) 특별진급 전쟁 시나리오 (KR: 제2차 한반도 전면전 / US: 제1도련선·인도태평양 전면전)
 * 4성 대장이 전시 총사령관으로 임명되어 5단계 대전략 작전을 지휘하고,
 * 완전 승전 시 국회·대통령 특별 의결로 5성 원수(Marshal / O-11)에 추대됩니다.
 */

const playVO = (...args) => globalThis.__playVO?.(...args);

export const MARSHAL_WARS = {
  kr: {
    code: "OPERATION IRON DAWN",
    title: "제2차 한반도 전면전 · 작전명 「철의 여명」",
    subtitle: "DEFCON 1 발령 · 전시 작전통제권 전환 · 한미연합전구사령관 임명",
    bg: "img/bg/war_room.jpg",
    medal: "태극무공훈장",
    marshalTitle: "대한민국 국군 원수 (★★★★★)",
    nodes: [
      { id: "nll", x: 78, y: 128, label: "서해 NLL" },
      { id: "dmz", x: 185, y: 108, label: "중부전선" },
      { id: "east", x: 292, y: 122, label: "동해·후방방공" },
      { id: "north", x: 188, y: 54, label: "적 전략거점" },
      { id: "peace", x: 382, y: 74, label: "전구 종전선" },
    ],
    phases: [
      {
        day: "D+0 · 03:40",
        node: 0,
        title: "제1국면 · 기습 포격과 서해 NLL 동시 침공 저지",
        brief: "심야 시간대 전방 155mm·방사포 동시 포격과 함께 수도권·주요 비행장을 겨냥한 탄도미사일 180여 발이 발사됐습니다. 동시에 서해 NLL 일대로 적 공기부양정과 특수전 함정이 대거 남하 중입니다. 전시 총사령관으로서 개전 첫 72시간의 방어 교리를 결정하십시오.",
        choices: [
          {
            label: "🛡️ 3축 체계(KAMD·KMPR) 전면 가동 + 전방 화력 즉각 대화력전",
            tag: "균형 방어 · 정석",
            desc: "천궁-II·L-SAM·패트리어트 통합 요격망으로 수도권을 방호하고 K9·현무로 적 포병진지를 무력화합니다.",
            dFront: 14, dForce: -6, dCoal: 10, score: 84,
            sitrep: "통합 방공망이 탄도미사일 86%를 요격했고, 40분 만의 정밀 대화력전으로 적 장사정포 진지 60%가 침묵했습니다. 수도권 공황을 막아내며 초기 방어선을 사수했습니다."
          },
          {
            label: "⚡ 공세적 선제 타격 · F-35A 스텔스 편대 및 현무-V 적 지휘부 직타",
            tag: "고위험 · 전선 급상승",
            desc: "초기 피해를 감수하고 적 전방 군단 지휘소와 방공 레이더망을 개전 6시간 내 마비시킵니다.",
            dFront: 20, dForce: -14, dCoal: 4, score: 88,
            sitrep: "스텔스 편대와 탄도미사일 일제 타격으로 적 1선 지휘통신망이 붕괴했습니다. 다만 방공 자산 분산으로 아군 기지 일부가 피탄되어 전력 소모가 컸습니다."
          },
          {
            label: "⚓ 서해 NLL 해·공군 집중 투입 · 적 상륙선단 해상 격멸 우선",
            tag: "해상 집중 · 보급선 보존",
            desc: "이지스 구축함·잠수함·해상초계기를 서해에 총동원해 적 상륙 전력을 수장시키고 중부전선은 지연 방어로 전환합니다.",
            dFront: 10, dForce: -4, dCoal: 8, score: 74,
            sitrep: "서해 NLL 적 상륙선단 70%를 격침하며 수도권 측면을 완벽히 방어했습니다. 다만 중부전선 일부 고지가 일시적으로 적 수중에 넘어갔습니다."
          }
        ]
      },
      {
        day: "D+7 · 14:00",
        node: 1,
        title: "제2국면 · 한반도 제공권·제해권 쟁탈전",
        brief: "개전 1주일, 적 잠수함 세력이 동·서해 해상교통로를 위협하고 잔존 지대공 미사일망이 아군 근접항공지원(CAS)을 방해하고 있습니다. 연합 증원 전력(미 항모강습단·전략폭격기)이 한반도 해역에 진입했습니다.",
        choices: [
          {
            label: "✈️ 한미 연합 SEAD(적 방공망 제압) 대공세 · 완전 제공권 장악",
            tag: "연합 합동 · 최고 효율",
            desc: "KF-21·F-35A와 미 전자전기(EA-18G)를 통합 운용해 적 방공망을 완전히 제거하고 제공권을 100% 확보합니다.",
            dFront: 15, dForce: -5, dCoal: 12, score: 86,
            sitrep: "48시간의 연합 전자전·정밀타격 끝에 한반도 상공의 완전 제공권을 장악했습니다. 아군 지상군이 공중 엄호 아래 자유롭게 기동할 수 있게 됐습니다."
          },
          {
            label: "🚢 동·서해 합동 대잠전(ASW) 봉쇄 · 미 항모전단 증원로 완전 개통",
            tag: "보급 안정 · 전력 회복",
            desc: "아군 잠수함·구축함·P-8 초계기를 총동원해 적 잠수함을 소탕하고 부산·진해 증원 항만을 안전하게 개방합니다.",
            dFront: 9, dForce: 6, dCoal: 10, score: 78,
            sitrep: "적 잠수함 14척을 격침·무력화하며 해상 보급로가 완전히 열렸습니다. 대규모 탄약·장비 증원이 도착해 아군 전력 보존율이 크게 회복됐습니다."
          },
          {
            label: "🔥 지상군 선제 반격 병행 · K2 기갑여단 철원·연천 축선 조기 돌파",
            tag: "강공 · 피해 감수",
            desc: "제공권이 완벽히 정리되기 전에 기갑 주력을 전방에 투입해 적 주력군을 조기에 밀어붙입니다.",
            dFront: 18, dForce: -15, dCoal: 2, score: 76,
            sitrep: "K2 기갑여단이 적 방어선을 뚫고 북상했지만, 잔존 적 대전차·방공 화력에 적지 않은 기갑 손실이 발생했습니다."
          }
        ]
      },
      {
        day: "D+18 · 05:30",
        node: 2,
        title: "제3국면 · 대규모 합동 반격 「철의 망치」",
        brief: "적 주력군의 탄약·유류 보급선이 한계에 다다랐습니다. 지금이 전쟁의 향방을 가를 대전환점입니다. 지상작전사령부 기동군단과 해병대 상륙전력, 공군 전략타격단을 어떻게 결합해 반격하시겠습니까?",
        choices: [
          {
            label: "⚔️ 양면 포위 섬멸 · 중부 기갑돌파 + 동·서해안 동시 상륙작전",
            tag: "교과서적 대승 · 5성급 지휘",
            desc: "정면 기갑군단 진격과 동시에 해병대·연합 상륙단이 적 측후방 항만을 점령해 적 전방 군단을 완벽히 고립시킵니다.",
            dFront: 18, dForce: -7, dCoal: 10, score: 92,
            sitrep: "인천상륙작전에 비견되는 완벽한 양면 포위 기동이 성공했습니다! 적 전방 3개 군단이 보급이 끊긴 채 집단 투항하며 전선이 단숨에 북상했습니다."
          },
          {
            label: "🎯 정밀 화력 소모전 · 무인기·장거리 미사일로 적 보급창·교량 초토화 후 진격",
            tag: "인명 피해 최소화",
            desc: "장병 희생을 줄이기 위해 5일간 정밀타격으로 적 전투 의지를 완전히 꺾은 뒤 안전하게 진격합니다.",
            dFront: 11, dForce: -2, dCoal: 12, score: 80,
            sitrep: "아군 인명 피해를 극소화하며 안정적으로 진격했습니다. 국민과 장병들의 신뢰가 급상승했으나 적 주력 일부가 후방으로 철수할 시간을 허용했습니다."
          },
          {
            label: "🚀 최단거리 수도 직공 · 특수전·공수부대 심층 강하 및 기갑 종심 돌진",
            tag: "초고속 · 보급 위험",
            desc: "보급선 신장을 감수하고 적 핵심 거점을 향해 최단 시간 내 종심 돌파를 감행합니다.",
            dFront: 22, dForce: -16, dCoal: -4, score: 82,
            sitrep: "놀라운 속도로 적 종심 깊숙이 진격했으나, 늘어난 보급선이 적 유격전에 노출되며 후방 경계 부담과 전력 손실이 커졌습니다."
          }
        ]
      },
      {
        day: "D+30 · 21:15",
        node: 3,
        title: "제4국면 · 적 비대칭·전략무기 위협과 동맹 조율",
        brief: "수세에 몰린 적 지도부가 전략 미사일 기지의 연료 주입 정황을 노출하며 최후의 비대칭 위협을 가하고 있습니다. 동맹국 워싱턴과 국내 전시 내각 모두 긴박하게 총사령관의 판단을 주시합니다.",
        choices: [
          {
            label: "🛰️ 한미 확장억제 가동 + 특수전·정밀타격으로 이동식 발사대(TEL) 동시 무력화",
            tag: "완벽 억지 · 전략적 결단",
            desc: "동맹국 전략자산 전개로 핵·전략무기 사용 의지를 원천 차단하고, 정찰위성·스텔스 자산으로 적 발사대를 정밀 제거합니다.",
            dFront: 12, dForce: -4, dCoal: 12, score: 90,
            sitrep: "한미 확장억제 선언과 동시 정밀타격으로 적 전략 발사대의 90%가 발사 전 무력화됐습니다. 최악의 파국을 막아낸 역사적 위기 관리로 평가받습니다."
          },
          {
            label: "📡 외교·심리전 병행 · 적 군부 온건파 대상 비공개 항복 채널 가동",
            tag: "정치·군사 복합 · 피해 최소",
            desc: "전면 타격과 동시에 적 야전 지휘관들에게 안전 보장과 정전 조건을 제시해 내부 와해를 유도합니다.",
            dFront: 10, dForce: 2, dCoal: 10, score: 82,
            sitrep: "적 후방 사령부 일부가 발사 명령을 거부하고 통신 채널에 응답했습니다. 추가 유혈 사태를 크게 줄이며 전쟁의 끝이 보이기 시작했습니다."
          },
          {
            label: "💣 전면 초토화 명령 · 적 미사일 기지 일대 대규모 융단 타격",
            tag: "강경 진압 · 국제 여론 부담",
            desc: "협상 여지를 배제하고 모든 가용 화력을 집중해 적 전략 거점을 완전히 파괴합니다.",
            dFront: 14, dForce: -8, dCoal: -12, score: 70,
            sitrep: "적 미사일 기지는 완전히 괴멸했으나, 민간 피해 우려로 동맹국과 국제 사회의 거센 외교적 압박이 쏟아졌습니다."
          }
        ]
      },
      {
        day: "D+45 · 11:00",
        node: 4,
        title: "제5국면 · 최후 결전과 역사적 종전·전구 안정화",
        brief: "적 정규군의 조직적 저항이 무너졌습니다. 이제 한반도 영구 평화와 전쟁의 최종 매듭을 지을 마지막 결단만이 남았습니다. 전시 총사령관으로서 최후 작전 명령을 하달하십시오.",
        choices: [
          {
            label: "🏛️ 압도적 무력 우위 기반 조건부 무조건 항복 접수 · 전구 안정화 작전 전환",
            tag: "완전 승전 · 원수 추대 정석",
            desc: "잔존 저항 세력을 완전히 포위 압박해 공식 항복 문서를 받아내고, 즉각 치안·인도적 복구·동맹 공동 관리 체제로 전환합니다.",
            dFront: 12, dForce: -2, dCoal: 14, score: 94,
            sitrep: "적 총참모부 대표단이 공식 항복 문서에 서명했습니다! 최소한의 추가 희생으로 완전한 승전을 완수하며, 국회와 국민 모두가 총사령관의 공훈을 칭송합니다."
          },
          {
            label: "🤝 조기 정전 협정 체결 · 아군 장병 신속 귀환 및 방어선 영구 강화",
            tag: "안정적 종결",
            desc: "더 이상의 소모전을 피하고 유리한 전선에서 즉각 정전 협정을 체결해 장병들을 가족의 품으로 돌려보냅니다.",
            dFront: 6, dForce: 5, dCoal: 8, score: 76,
            sitrep: "전쟁이 조기에 종결되며 장병들의 생명을 지켜냈습니다. 다만 적 잔존 지휘부 처리가 미완으로 남아 정치권에서 공방이 이어집니다."
          },
          {
            label: "⚔️ 잔존 거점 끝까지 소탕 · 최후 1개 연대까지 완전 섬멸",
            tag: "철저 섬멸 · 높은 소모",
            desc: "협상 없이 모든 잔존 산악 거점을 무력으로 완전히 소탕한 뒤 승전을 선포합니다.",
            dFront: 14, dForce: -14, dCoal: -4, score: 78,
            sitrep: "모든 잔존 저항 거점을 완전히 제압했으나, 마지막 산악전에서 아군 정예 부대에 안타까운 추가 희생이 발생했습니다."
          }
        ]
      }
    ]
  },

  us: {
    code: "OPERATION PACIFIC VANGUARD",
    title: "인도태평양 전면전 · Operation Pacific Vanguard",
    subtitle: "DEFCON 1 발령 · 미 인도태평양 전시 총사령관 (Supreme Theater Commander) 임명",
    bg: "img/bg/us_war_room.jpg",
    medal: "Medal of Honor (명예훈장)",
    marshalTitle: "미합중국 5성 원수 (★★★★★ · O-11)",
    nodes: [
      { id: "strait", x: 76, y: 124, label: "제1도련선" },
      { id: "guam", x: 184, y: 132, label: "오키나와·괌" },
      { id: "scs", x: 158, y: 66, label: "남중국해" },
      { id: "break", x: 288, y: 88, label: "함대 결전" },
      { id: "peace", x: 386, y: 74, label: "태평양 종전" },
    ],
    phases: [
      {
        day: "D+0 · 04:15Z",
        node: 0,
        title: "제1국면 · 개전 미사일 포화 및 제1도련선(First Island Chain) 방어",
        brief: "오키나와와 괌 전진기지를 겨냥한 대함탄도미사일(ASBM) 동시 포화 공격이 개시됐고, 적 기동함대가 서태평양 핵심 해협 봉쇄에 나섰습니다. DEFCON 1 아래 임명된 전시 총사령관으로서 개전 초기 방어 교리를 하달하십시오.",
        choices: [
          {
            label: "🛡️ 통합 미사일 방어(Aegis·THAAD) + 분산해양작전(DMO) 전면 가동",
            tag: "균형 교리 · 정석",
            desc: "항모강습단을 적 A2/AD 사거리 외곽으로 분산 기동시키고 통합 방공망으로 기지를 방호하며 발사 원점을 정밀 반격합니다.",
            dFront: 14, dForce: -6, dCoal: 10, score: 84,
            sitrep: "분산 배치 덕분에 적 정찰위성의 표적 획득을 무력화했습니다. 이지스·사드 통합 방공망이 미사일 84%를 요격하며 핵심 항모 전력을 온전히 보존했습니다."
          },
          {
            label: "⚡ B-21 스텔스 폭격기·토마호크 즉각 심층 반격 (발사 기지 직타)",
            tag: "고위험 · 초고속 주도권",
            desc: "전진기지 초기 피해를 감수하고 12시간 내에 적 C4ISR 지휘망과 연안 미사일 포대를 마비시킵니다.",
            dFront: 20, dForce: -14, dCoal: 4, score: 88,
            sitrep: "장거리 스텔스 타격으로 적 초수평선 레이더망을 무력화하고 초기 주도권을 장악했습니다. 다만 전진 비행장 복구 부담으로 전력 소모가 컸습니다."
          },
          {
            label: "⚓ 동맹 해군 호위 최우선 · 한·미·일·호주 태평양 보급로 사수",
            tag: "동맹 결속 · 보급선 보존",
            desc: "동맹국 해상 방어와 잠수함 방어막 구축에 집중해 태평양 병참 동맥이 끊기지 않도록 지킵니다.",
            dFront: 10, dForce: -4, dCoal: 12, score: 76,
            sitrep: "동맹 해군과 해상 보급로를 완벽히 지켜내며 연합 결속이 급상승했습니다. 다만 제1도련선 전방 도서 거점이 강한 압박에 노출됐습니다."
          }
        ]
      },
      {
        day: "D+9 · 16:00Z",
        node: 1,
        title: "제2국면 · 서태평양 제공권·수중 제해권 결전",
        brief: "적 원자력 공격잠수함이 태평양 수송선단을 위협하고 있으며, 조밀한 지대공 미사일 방공망이 제1도련선 상공을 가로막고 있습니다. 미 항모강습단 3개 전단과 동맹 항공단이 총사령관의 작전 명령을 대기 중입니다.",
        choices: [
          {
            label: "✈️ 다영역 합동 공세 (F-35 · 버지니아급 SSN · 사이버전 동시 투입)",
            tag: "다영역 합동 · 최고 효율",
            desc: "잠수함 어뢰 매복, 스텔스 SEAD 출격, 위성 사이버 교란을 72시간 내 동시 동기화해 적 함대 방공망을 붕괴시킵니다.",
            dFront: 16, dForce: -5, dCoal: 12, score: 88,
            sitrep: "1944년 이후 최대 규모의 다영역 결전에서 적 수상전투단이 공중 엄호를 상실하고 연안 해역으로 전면 후퇴했습니다."
          },
          {
            label: "🚢 잠수함 울프팩(Wolfpack) 해상 봉쇄 · 적 에너지·탄약 보급 차단",
            tag: "전력 회복 · 병참 압박",
            desc: "버지니아급 잠수함과 P-8A 초계기로 적 해상 보급로를 차단하는 동안 미 본토(CONUS) 공수 증원으로 전력을 재정비합니다.",
            dFront: 10, dForce: 6, dCoal: 8, score: 78,
            sitrep: "적 해상 병참 물동량이 65% 급감했고, 본토 전략 공수가 도착하면서 아군 전진 전력 보존율이 뚜렷하게 회복됐습니다."
          },
          {
            label: "🔥 항모강습단 3개 전단 해협 정면 돌파 · 주력 함대 결전 강제",
            tag: "공격적 승부수 · 고손실",
            desc: "항모전단을 분쟁 해협 정면으로 밀어 넣어 적 주력 함대와의 즉각적인 전면 결전을 유도합니다.",
            dFront: 19, dForce: -16, dCoal: 2, score: 76,
            sitrep: "미 해군 함재기가 적 주력 대형함 2척을 격침했으나, 밀집 대함미사일 세례에 아군 호위 구축함 2척이 중파됐습니다."
          }
        ]
      },
      {
        day: "D+21 · 06:00Z",
        node: 2,
        title: "제3국면 · 대반격(Grand Counteroffensive) — 해협 봉쇄 돌파",
        brief: "적 해·공군 예비 전력이 한계에 다다랐습니다. 미 합참(JCS)과 동맹국 수도 모두 서태평양 항행의 자유를 회복할 결정적 대반격을 승인했습니다.",
        choices: [
          {
            label: "⚔️ 양축 연합 상륙·항모 돌파 (해병연안전투단 + 동맹 기동전단 협공)",
            tag: "5성급 대전략 기동",
            desc: "미 해병연안전투단(MLR)의 도서 탈환과 동맹 항모·상륙전단의 측면 포위를 결합해 적 봉쇄망을 단숨에 붕괴시킵니다.",
            dFront: 18, dForce: -7, dCoal: 12, score: 92,
            sitrep: "96시간 만의 양축 협공으로 적 봉쇄선이 완전히 무너졌습니다! 연합군이 핵심 전략 요충지와 레이더 기지를 온전히 탈환했습니다."
          },
          {
            label: "🎯 원거리 정밀 소모전 (JASSM-ER · LRASM 집중 타격 후 안전 진격)",
            tag: "인명 피해 최소화",
            desc: "상륙 전력 투입 전 5일간 장거리 정밀유도무기로 적 해안 방어망을 완전히 무력화한 뒤 진격합니다.",
            dFront: 11, dForce: -2, dCoal: 10, score: 80,
            sitrep: "미군 인명 피해를 극소화하며 미국 내 여론 지지를 굳건히 유지했으나, 적 잔존 함대 일부가 요새화된 항만으로 철수했습니다."
          },
          {
            label: "🚀 고속 기동타격대 적 전구사령부 기습 타격",
            tag: "대담한 종심 타격",
            desc: "보급선 부담을 감수하고 고속 함정·장거리 타격 편대를 적 전구 지휘 거점으로 직투입합니다.",
            dFront: 21, dForce: -15, dCoal: -4, score: 82,
            sitrep: "적 지도부에 치명적 충격을 주며 지휘 계통을 교란했지만, 길어진 공중급유·호위 라인에 상당한 전력 손실이 누적됐습니다."
          }
        ]
      },
      {
        day: "D+34 · 22:30Z",
        node: 3,
        title: "제4국면 · 전략적 확전과 핵 억지(Nuclear Deterrence) 위기",
        brief: "재래식 전력의 결정적 패배에 직면한 적 전략군이 핵 대비 태세를 격상했습니다. 미 대통령이 백악관 국가안보회의(NSC)를 긴급 소집해 전시 총사령관의 판단을 요청합니다.",
        choices: [
          {
            label: "🛰️ 미 3대 핵전력(Strategic Triad) 경계 격상 + 재래식 확전 통제선 명확화",
            tag: "완벽한 전략 억지",
            desc: "전략핵잠수함(SSBN)·B-2 전개로 압도적 핵 억지력을 과시하는 동시에 본토 심층 타격 제한선을 분명히 해 오판을 차단합니다.",
            dFront: 12, dForce: -3, dCoal: 14, score: 92,
            sitrep: "정교한 억지 전략이 적중했습니다. 적 전략군이 발사 경계 태세를 해제했고, 미군의 재래식 전구 우위는 흔들림 없이 유지됐습니다."
          },
          {
            label: "📡 군사 핫라인 가동 + 동맹국 외교 공조를 통한 확전 차단",
            tag: "외교·군사 복합 대응",
            desc: "동맹국 수도와 보조를 맞춰 적 군부와 긴급 직통 채널을 가동해 레드라인을 확정하고 강경파를 고립시킵니다.",
            dFront: 9, dForce: 2, dCoal: 12, score: 82,
            sitrep: "군 대 군 직통 핫라인이 핵 충돌 위기를 잠재웠고, 중립국들까지 연합군의 평화 프레임워크를 지지하기 시작했습니다."
          },
          {
            label: "💣 내륙 이중용도 전략 인프라 전면 타격 확대",
            tag: "강경 압박 · 확전 리스크",
            desc: "적 내륙 지휘·전력 인프라까지 전면 타격해 저항 의지를 완전히 꺾습니다.",
            dFront: 14, dForce: -9, dCoal: -14, score: 68,
            sitrep: "적의 조직적 저항은 크게 약화됐으나, 확전 공포로 유럽·아시아 동맹국들의 외교적 균열이 심화됐습니다."
          }
        ]
      },
      {
        day: "D+48 · 10:00Z",
        node: 4,
        title: "제5국면 · 결정적 승전과 태평양 종전 협정 (Pacific Armistice)",
        brief: "서태평양의 적 해·공군 전력이 사실상 무력화됐습니다. 전후 인도태평양 질서와 귀관의 역사적 위상을 확정할 마지막 통수 결단만이 남았습니다.",
        choices: [
          {
            label: "🏛️ 기함 함상 공식 항복 접수 & 동맹 항행의 자유 헌장 체결",
            tag: "완전 승전 · 5성 원수 정석",
            desc: "미 기함 함상에서 검증 가능한 비무장화 조항과 영구적인 동맹 안보 헌장을 관철해 역사적 승전을 완성합니다.",
            dFront: 12, dForce: -2, dCoal: 14, score: 94,
            sitrep: "기함 함상에서 연합군 조건에 따른 공식 종전 협정이 조인됐습니다! 미 의회가 역사적인 5성 원수(O-11) 추대 합동결의안을 상정했습니다."
          },
          {
            label: "🤝 유리한 전선에서 즉각 정전 체결 · 미군 장병 신속 귀환",
            tag: "실용적 조기 종전",
            desc: "현재의 유리한 전선에서 즉각 포성을 멈추고 미군 장병들을 신속히 본국으로 귀환시킵니다.",
            dFront: 6, dForce: 5, dCoal: 8, score: 76,
            sitrep: "태평양 전역의 포성이 멎고 장병들이 무사히 귀환했으나, 분쟁 해역의 영구 해결이 미완으로 남아 의회 논쟁이 이어집니다."
          },
          {
            label: "⚔️ 완전 무조건 항복까지 전면 해상 봉쇄 무기한 지속",
            tag: "강경 완결 · 장기 소모",
            desc: "모든 적 항만이 무조건 항복할 때까지 전시 해상 봉쇄를 끝까지 유지합니다.",
            dFront: 14, dForce: -13, dCoal: -6, score: 78,
            sitrep: "완전 항복을 받아냈으나, 수 주간 이어진 봉쇄로 세계 교역망이 타격을 입고 동맹군 추가 희생이 발생했습니다."
          }
        ]
      }
    ]
  }
};

function injectStyles() {
  if (document.getElementById("mw-style")) return;
  const st = document.createElement("style");
  st.id = "mw-style";
  st.textContent = `
    #marshalWarM { position:fixed; inset:0; z-index:135; display:none; align-items:center; justify-content:center; padding:18px;
      background:radial-gradient(ellipse at center, rgba(38,14,14,.92), rgba(5,8,14,.97)); overflow-y:auto; }
    #marshalWarM.on { display:flex; }
    .mw-shell { width:min(960px,96vw); background:#0c121c; border:1.5px solid #e05a47; border-radius:12px;
      box-shadow:0 0 42px rgba(224,90,71,.28); overflow:hidden; color:#eaf0f8; font-family:inherit; }
    .mw-top { padding:16px 20px; background:linear-gradient(120deg, rgba(84,18,18,.92), rgba(16,24,38,.95));
      border-bottom:1px solid rgba(242,202,92,.35); display:flex; justify-content:space-between; align-items:center; gap:12px; }
    .mw-code { font-size:11px; letter-spacing:2px; color:#ff8d7a; font-weight:800; }
    .mw-title { font-size:19px; font-weight:800; color:#fff5d6; margin-top:2px; }
    .mw-sub { font-size:12px; color:#d2dce8; margin-top:2px; }
    .mw-close { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.22); color:#e4ecf5; border-radius:6px;
      padding:6px 12px; cursor:pointer; font-size:12px; }
    .mw-close:hover { background:rgba(255,95,82,.25); border-color:#ff7b6b; }
    .mw-hud { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; padding:12px 20px; background:#090e17;
      border-bottom:1px solid #1f2c3f; }
    .mw-stat { background:#111a28; border:1px solid #24344c; border-radius:8px; padding:8px 10px; }
    .mw-stat small { display:block; font-size:11px; color:#9eb2c9; }
    .mw-stat b { font-size:17px; color:#f7e2a8; }
    .mw-bar { height:5px; border-radius:3px; background:#1c293d; margin-top:5px; overflow:hidden; }
    .mw-bar i { display:block; height:100%; background:linear-gradient(90deg,#e05a47,#f2ca5c); transition:width .35s; }
    .mw-body { display:grid; grid-template-columns:300px 1fr; gap:16px; padding:18px 20px; }
    .mw-map { background:#08101a; border:1px solid #22344d; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:10px; }
    .mw-map-h { font-size:12px; font-weight:700; color:#9fc0e4; display:flex; justify-content:space-between; }
    .mw-log { flex:1; max-height:175px; overflow-y:auto; font-size:11.5px; color:#b9c9dc; display:flex; flex-direction:column; gap:6px;
      border-top:1px solid #1b2a40; padding-top:8px; }
    .mw-log div { background:rgba(255,255,255,.03); border-left:2px solid #f2ca5c; padding:5px 8px; border-radius:0 4px 4px 0; }
    .mw-stage { display:flex; flex-direction:column; gap:12px; }
    .mw-day { display:inline-block; font-size:11px; font-weight:800; color:#ff9d8c; background:rgba(224,90,71,.16);
      border:1px solid rgba(224,90,71,.4); padding:3px 9px; border-radius:99px; width:fit-content; }
    .mw-stage h3 { margin:0; font-size:17px; color:#fff; }
    .mw-brief { margin:0; font-size:13px; line-height:1.62; color:#d7e2ef; background:#111b2a; border:1px solid #243752;
      border-radius:8px; padding:12px 14px; }
    .mw-choices { display:flex; flex-direction:column; gap:9px; }
    .mw-btn { text-align:left; background:#132033; border:1px solid #2c4363; border-radius:8px; padding:11px 14px;
      color:#eef4fc; cursor:pointer; transition:transform .12s, border-color .15s, background .15s; }
    .mw-btn:hover { background:#1b2d47; border-color:#f2ca5c; transform:translateY(-1px); }
    .mw-btn-top { display:flex; justify-content:space-between; align-items:center; gap:8px; font-weight:700; font-size:13.5px; }
    .mw-tag { font-size:10.5px; padding:2px 7px; border-radius:99px; background:rgba(242,202,92,.14); color:#f2ca5c; white-space:nowrap; }
    .mw-btn small { display:block; margin-top:4px; font-size:12px; color:#a9bdd4; line-height:1.45; }
    .mw-sitrep { background:rgba(242,202,92,.09); border:1px solid rgba(242,202,92,.45); border-radius:8px; padding:13px 15px; }
    .mw-sitrep b { display:block; color:#f7d572; margin-bottom:5px; font-size:13px; }
    .mw-sitrep p { margin:0 0 10px; font-size:13px; line-height:1.58; color:#eef3fa; }
    .mw-next { background:linear-gradient(90deg,#c84b31,#e2a43b); border:none; color:#fff; font-weight:800; padding:10px 18px;
      border-radius:7px; cursor:pointer; font-size:13.5px; }
    .mw-next:hover { filter:brightness(1.08); }
    .mw-end { padding:18px; text-align:center; background:#101927; border:1.5px solid #f2ca5c; border-radius:10px; }
    .mw-end h2 { margin:0 0 8px; color:#ffe082; font-size:21px; }
    .mw-end p { margin:0 0 14px; font-size:13.5px; line-height:1.62; color:#dde7f3; }
    @media (max-width:780px) { .mw-body { grid-template-columns:1fr; } .mw-hud { grid-template-columns:repeat(2,1fr); } }
  `;
  document.head.appendChild(st);
}

function theaterSVG(war, curIdx) {
  const pts = war.nodes;
  const lines = pts.slice(0, -1).map((p, i) => {
    const n = pts[i + 1];
    const done = i < curIdx;
    return `<line x1="${p.x}" y1="${p.y}" x2="${n.x}" y2="${n.y}" stroke="${done ? "#f2ca5c" : "#304866"}" stroke-width="${done ? 2.6 : 1.6}" stroke-dasharray="${done ? "" : "4 3"}"/>`;
  }).join("");
  const dots = pts.map((p, i) => {
    const active = i === curIdx, done = i < curIdx;
    const fill = done ? "#4cd97b" : active ? "#ff5c4d" : "#243750";
    const stroke = active ? "#ffe28a" : done ? "#c8ffd8" : "#5e7a9e";
    return `<g>
      ${active ? `<circle cx="${p.x}" cy="${p.y}" r="13" fill="rgba(255,92,77,.25)"/>` : ""}
      <circle cx="${p.x}" cy="${p.y}" r="${active ? 7 : 5.5}" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/>
      <text x="${p.x}" y="${p.y + 19}" text-anchor="middle" font-size="9.5" fill="${active ? "#fff2c2" : "#b8cbe0"}" font-weight="${active ? 700 : 500}">${p.label}</text>
    </g>`;
  }).join("");
  return `<svg viewBox="0 0 450 175" width="100%" style="background:radial-gradient(circle at 50% 45%,#13253a,#08101a);border-radius:7px;border:1px solid #1e324a">
    <path d="M0 44 H450 M0 88 H450 M0 132 H450 M90 0 V175 M180 0 V175 M270 0 V175 M360 0 V175" stroke="#182b40" stroke-width=".7"/>
    ${lines}${dots}
  </svg>`;
}

export function openMarshalWar({ nation = "kr", rankName = "대장", cmdrName = "지휘관", onComplete }) {
  injectStyles();
  const war = nation === "us" ? MARSHAL_WARS.us : MARSHAL_WARS.kr;
  let el = document.getElementById("marshalWarM");
  if (!el) {
    el = document.createElement("div");
    el.id = "marshalWarM";
    document.body.appendChild(el);
  }

  const state = {
    idx: 0,
    front: 42,
    force: 85,
    coal: 80,
    score: 0,
    sitrep: null,
    logs: [`[개전] ${rankName} ${cmdrName}, 전시 총사령관 취임 · DEFCON 1 발령`],
    finished: false,
  };

  const clamp = (v) => Math.max(0, Math.min(100, v));

  function render() {
    const ph = war.phases[state.idx];
    const progress = Math.min(state.idx + (state.sitrep ? 1 : 0), war.phases.length);
    const won = state.score >= 380 && state.front >= 70 && state.force >= 40;
    const stalemate = !won && state.score >= 300 && state.front >= 50;

    let rightHTML = "";
    if (state.finished) {
      const verdictTitle = won
        ? `🏆 완전 승전! ${war.marshalTitle} 추대 의결`
        : stalemate
          ? "⚔️ 전선 방어 성공 · 원수 추대 기준 미달"
          : "⚠️ 작전 고전 · 전구 재정비 필요";
      const verdictBody = won
        ? `${rankName} ${cmdrName} 총사령관의 탁월한 대전략 지휘로 <b>${war.title}</b>에서 압도적 승전을 거두었습니다.<br>전공 점수 <b>${state.score}점</b> · 전선 우세도 <b>${state.front}%</b> · 전력 보존 <b>${state.force}%</b>의 공훈을 인정받아 <b>${war.medal}</b> 수여와 함께 역사적인 <b>5성 원수</b>로 특별 진급합니다.`
        : stalemate
          ? `전선을 지켜내고 최악의 위기는 넘겼으나(전공 ${state.score}점 · 전선 ${state.front}%), 5성 원수 특별 추대 기준(전공 380점+ · 전선 70%+ · 전력 40%+)에는 다소 못 미쳤습니다. 전력을 재정비해 다시 도전할 수 있습니다.`
          : `전력 소모(${state.force}%) 또는 전선 악화(${state.front}%)로 완전 승전에 이르지 못했습니다. 집무실로 복귀해 전력을 재정비한 뒤 다시 도전하십시오.`;
      rightHTML = `<div class="mw-end">
        <h2>${verdictTitle}</h2>
        <p>${verdictBody}</p>
        <button class="mw-next" id="mwFinishBtn">${won ? "★ 5성 원수 특별진급식 거행 ›" : "집무실로 복귀"}</button>
      </div>`;
    } else if (state.sitrep) {
      rightHTML = `<div class="mw-sitrep">
        <b>📡 전시 작전 전문 (SITREP · ${ph.day})</b>
        <p>${state.sitrep.text}</p>
        <div style="font-size:12px;color:#cbd9ea;margin-bottom:12px">${state.sitrep.delta}</div>
        <button class="mw-next" id="mwNextBtn">${state.idx + 1 < war.phases.length ? `다음 국면 전개 (${state.idx + 2}/${war.phases.length}) ▶` : "최종 종전 판정 확인 ▶"}</button>
      </div>`;
    } else {
      rightHTML = `
        <span class="mw-day">${ph.day} · PHASE ${state.idx + 1} / ${war.phases.length}</span>
        <h3>${ph.title}</h3>
        <p class="mw-brief">${ph.brief}</p>
        <div class="mw-choices">
          ${ph.choices.map((c, ci) => `<button class="mw-btn" data-ci="${ci}">
            <div class="mw-btn-top"><span>${c.label}</span><span class="mw-tag">${c.tag}</span></div>
            <small>${c.desc}</small>
          </button>`).join("")}
        </div>`;
    }

    el.innerHTML = `<div class="mw-shell">
      <div class="mw-top">
        <div>
          <div class="mw-code">🚨 ${war.code} · 5-STAR MARSHAL CAMPAIGN</div>
          <div class="mw-title">${war.title}</div>
          <div class="mw-sub">${war.subtitle}</div>
        </div>
        ${state.finished ? "" : `<button class="mw-close" id="mwAbortBtn">작전 중단</button>`}
      </div>
      <div class="mw-hud">
        <div class="mw-stat"><small>전선 우세도 (목표 70%+)</small><b>${state.front}%</b><div class="mw-bar"><i style="width:${state.front}%"></i></div></div>
        <div class="mw-stat"><small>전력 보존율 (목표 40%+)</small><b>${state.force}%</b><div class="mw-bar"><i style="width:${state.force}%"></i></div></div>
        <div class="mw-stat"><small>동맹·국민 결속</small><b>${state.coal}%</b><div class="mw-bar"><i style="width:${state.coal}%"></i></div></div>
        <div class="mw-stat"><small>전공 점수 (원수 380+)</small><b>${state.score} / 460</b><div class="mw-bar"><i style="width:${Math.min(100, Math.round(state.score / 4.6))}%"></i></div></div>
      </div>
      <div class="mw-body">
        <div class="mw-map">
          <div class="mw-map-h"><span>🗺️ 전구 작전도</span><span>진행 ${progress}/${war.phases.length}</span></div>
          ${theaterSVG(war, state.finished ? war.nodes.length : state.idx)}
          <div class="mw-log">${state.logs.slice().reverse().map((l) => `<div>${l}</div>`).join("")}</div>
        </div>
        <div class="mw-stage">${rightHTML}</div>
      </div>
    </div>`;

    el.querySelectorAll(".mw-btn").forEach((btn) => {
      btn.onclick = () => {
        if (nation !== "us") {
          if (state.idx <= 1) playVO(25);
          else if (state.idx <= 3) playVO(26);
        }
        const c = ph.choices[Number(btn.dataset.ci)];
        const coalBonus = state.coal >= 85 ? 4 : state.coal < 55 ? -6 : 0;
        const pts = c.score + coalBonus;
        state.front = clamp(state.front + c.dFront);
        state.force = clamp(state.force + c.dForce);
        state.coal = clamp(state.coal + c.dCoal);
        state.score += pts;
        const fmtD = (n) => (n >= 0 ? `+${n}` : `${n}`);
        state.sitrep = {
          text: c.sitrep,
          delta: `전선 ${fmtD(c.dFront)}% · 전력 ${fmtD(c.dForce)}% · 결속 ${fmtD(c.dCoal)}% · 전공 +${pts}점`,
        };
        state.logs.push(`[${ph.day}] ${c.tag} · 전공 +${pts}`);
        render();
      };
    });

    const nextBtn = el.querySelector("#mwNextBtn");
    if (nextBtn) {
      nextBtn.onclick = () => {
        state.sitrep = null;
        if (state.idx + 1 < war.phases.length) state.idx++;
        else {
          state.finished = true;
          const isWin = state.score >= 380 && state.front >= 70 && state.force >= 40;
          if (isWin && nation !== "us") playVO(27);
        }
        render();
      };
    }

    const abortBtn = el.querySelector("#mwAbortBtn");
    if (abortBtn) abortBtn.onclick = () => { globalThis.__stopVO?.(); el.classList.remove("on"); };

    const finBtn = el.querySelector("#mwFinishBtn");
    if (finBtn) {
      finBtn.onclick = () => {
        globalThis.__stopVO?.();
        el.classList.remove("on");
        if (onComplete) onComplete({ won, stalemate, score: state.score, front: state.front, force: state.force, coal: state.coal, warTitle: war.title });
      };
    }
  }

  el.classList.add("on");
  playVO(nation === "us" ? 58 : 24);
  render();
}
