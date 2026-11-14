# ChinTalk — 중국어 구조화 듣기 학습 PWA 설계서

> **문서 버전**: v1.2 (v1.1 검토 반영)
> **작성일**: 2026-11-05
> **상태**: 콘텐츠 작성 완료 (8권 × 20과 = 160과) + 구조화 듣기 학습 모드(PRD) 반영, 구현 대기
> **v1.2 변경 요지**: 화면 ID 통일 · 검색/플래시카드 제외 확정 · 문장 통합 mp3 · mp3 캐싱 정책 · 성조 파형 Phase 2 분리 · 해금/데일리/스트릭 규칙 확정 (§20 참조)

---

## 0. 결정사항 요약 (Decisions)

| 항목 | 결정 |
|---|---|
| 접근 제어 | **완전 공개** — URL만 알면 접근, 로그인 없음 |
| MVP 범위 | (1) 160과 회화 + 구절·문장 TTS · (2) 한자·병음·한글 토글 + 진도 · (3) **구조화 듣기 2모드**(4단계 심화 학습·10분 데일리) · (4) 3색 형광펜·스트릭·편하게 듣기 — **검색·전체 어휘 SRS는 범위 제외, 심화 학습의 못한 문장 복습(1·3·7일)만 포함** |
| 디자인 톤 | **모던 회화 학습앱** (밝은 배경 + 포인트 컬러, 카드형 UI) + **큰글씨 토글 옵션** |
| 배포 | **GitHub Pages** (`https://mykim711231.github.io/ChinTalk/`), 앱스토어 미사용 |
| 음성 | **사전 합성 mp3 우선** (문장=통문장 합성, 구절=별도 합성) + Web Speech API 폴백 (화면 켜진 상태 한정) |
| 말뭉치 읽기 | **문장 + 구절 2단계** — 긴 문장은 `／` 구분자로 호흡 단위 분할, 4가지 재생 모드(구절/문장/끊어읽기/전체) |
| 핵심 학습 철학 | **소리→의미 직결 · Chunk 리듬 체화 · 심리 허들 낮추기** (한국인 3대 고통: 한글 해독 의존·성조 무너짐·3일 포기 해소) |
| 학습 모드 | **모드1: 4단계 심화 마스터리** (Blind→Script→Shadowing→Final Check, 사용자 주도) + **모드2: 10분 데일리 루틴** (타이머 기반, 시스템 주도) |
| 레벨 명칭 | HSK 급수 대신 **한국인 공감형**: Lv.1 왕초보 귀 트이기 / Lv.2 중국어 벽 뚫기 / Lv.3 네이티브 리듬 정복 / Lv.4 프리토킹 마스터 |
| 발음 함정 | **한국인 발음 함정 경고** — q는 '츄'가 아님, 和는 '훠' 등 특정 Chunk 탭 시 💡팝업 |
| 쉐도잉 피드백 | **MVP**: 녹음 → 내 목소리 재생 → 원어민과 번갈아 비교 청취. **Phase 2**: 성조 파형(Pitch Contour) 비교 (초록=일치/빨강=불일치) |
| 3색 형광펜 | 사용자 직접 마킹 (🟢바로 이해/🟡헷갈림/🔴완전 생소) → 성취감 시각화 |
| 편하게 듣기 | 모드1·2 **완료한 음원만 해금** — 🎧출근길/설거지/자장가용 큐레이션, 백그라운드 재생 |
| 게이미피케이션 | 3색 형광펜 달성률 · 연속 학습 배지(스트릭) · 레벨 정복 뱃지 |
| 분석 도구 | **미설치** (사용자 추적 없음) |
| 알림 | 웹 푸시 미사용 |
| 앱 아이콘 | 텍스트 마크 "Chin·Talk" SVG |
| 용량 정책 | **단말기 디스크 점유 최소화** — 앱 셸 + vol1 JSON만 precache, mp3는 **과 단위 prefetch + vol 단위 사용자 다운로드**, 설정에서 정리 가능 |
| 저작권·라이선스 | **AI 보조 제작 + 직접 검수·편집**(사실대로 표기). 무료 공개. 코드 MIT, 과 콘텐츠 별도 안내문, **`word-dict.json`만 CC BY-SA 4.0** — Footer + About 안내 의무 |
| 콘텐츠 주제 | **북경 표준어(普通话) 일상·비즈니스 회화** (신앙·종교 콘텐츠 없음) |
| 데일리 음원 선택 | 자동 추천(진행 중 과 → 다음 미완료 과 → 첫 과), 시작 전 변경 가능 (§12.4) |
| 해금 규칙 | 마스터리 Final Check 제출 **또는** 데일리 6단계 종료 시 대상 과 해금 (§12.3) |
| 날짜 기준 | 모든 날짜는 **로컬 타임존** `YYYY-MM-DD` (스트릭·데일리, UTC 금지) |

---

## 1. 프로젝트 개요

### 1.1 목적
북경 표준어(普通话)의 일상·여행·비즈니스 회화를 **"구조화된 듣기" 방식**으로 학습할 수 있는 PWA를 제작한다. 문장을 **소리 덩어리(Chunk) 단위로 끊어** 한자·병음·한글 번역과 함께 듣고, 쉐도잉·성조 피드백으로 체화하도록 하며, 앱스토어 없이 URL 한 줄로 배포한다. 오프라인·음성·진도·형광펜 복습을 지원한다.

### 1.2 핵심 학습 철학 (한국인 3대 고통 해소)

한국인 중국어 학습자가 흔히 겪는 세 가지 고통을 설계의 중심축으로 삼는다:

| 고통 | 원인 | 해결 원칙 |
|---|---|---|
| **한글 해독 의존** | 눈으로 한자를 보고 한글로 번역한 뒤에야 이해 | **"소리(Sound) → 의미(Meaning)" 직결** — Blind 듣기 → 스크립트 확인 순서로 소리 우선 신경 회로 형성 |
| **성조 무너짐** | 긴 문장을 통째로 듣고 따라 해 성조 리듬 상실 | **Chunk(소리 덩어리) 단위 리듬 체화** — 호흡 단위로 끊어 성조·리듬을 몸에 새김 |
| **3일 만에 포기** | "공부"라는 심리적 부담과 막연한 목표 | **명확한 가이드 + 성취감** — 게임 같은 4단계·10분 루틴, 3색 형광펜·배지로 진척 시각화 |

### 1.3 핵심 가치 제안
- **듣고 이해한다** — Blind(자막 블러)로 시작해 소리→의미 직결 (오프라인 지원)
- **끊어서 체화한다** — Chunk 단위 재생·쉐도잉·성조 파형 비교
- **부담 없이 매일** — 10분 데일리 루틴, 편하게 듣기(백그라운드)
- **보이는 성취** — 3색 형광펜 달성률, 연속 학습 배지
- **꾸준히 복습** — 🔴북마크 구절을 마스터리에서 재학습 + 편하게 듣기로 반복 노출

### 1.4 비목표 (Out of Scope, Phase 1)
- 사용자 계정 / 클라우드 동기화
- 음성 인식(STT) 기반 발음 채점·시험 (성조 비교는 Phase 2에서 **시각 참고용**, 점수화 없음)
- 검색·전체 어휘 SRS — 듣기 중심 앱에서 제외 (못한 문장 복습만 §6.6 심화 학습의 1·3·7일 플래시카드로 제공)
- 멀티 디바이스 진도 공유
- 동영상 강의
- 웹 푸시 알림
- 사용자 분석/추적 (개인정보 부담 0, 로그 없음)

### 1.5 저작권 & 안내문 (필수)

**Footer (모든 화면 하단):**
```
© ChinTalk. 학습용 무료 앱 · AI 보조로 제작하고 직접 검수·편집했습니다.
```

**About 페이지 (설정 → 정보):**
> ### 콘텐츠 출처 및 이용 안내
> 본 앱의 중국어 회화·어휘·병음·문법 설명은 AI(DeepSeek)의 도움을
> 받아 제작한 뒤 직접 검수·편집했습니다. 학습 목적의 무료 앱입니다.
> 앱 코드는 MIT 라이선스입니다.
>
> **단어장 사전(`word-dict.json`) 출처**: CC-CEDICT
> (CC BY-SA 4.0, 원문 링크)를 바탕으로 한국어 뜻풀이를 새로 작성·재구성했습니다
> (수정됨). 이 사전 파일만 CC BY-SA 4.0으로 공개되며 같은 조건으로 공유할 수 있습니다.

---

## 2. 사용자 페르소나 & 시나리오

### 2.1 페르소나

| 페르소나 | 특징 | 주요 사용 맥락 |
|---|---|---|
| **P1 김직장인 (30대 남)** | 출퇴근 지하철, 중국 출장 준비, 짧은 틈새 시간 | 비즈니스 회화(vol4·5), 10분 데일리, 편하게 듣기 |
| **P2 이대학생 (20대 여)** | 중국어 회화 초·중급, 교환학생 준비, 데스크톱+모바일 | 기초·생활 회화(vol1·2), 문법 포인트, 관련 단어 모음 |
| **P3 박여행가 (40대 남)** | 중국 자유여행 준비, 시력 약화, Android 폰 | 여행 회화(vol3), 큰글씨 모드, 천천히 듣기 |
| **P4 최은퇴자 (60대 여)** | 취미로 중국어 시작, 한글 번역 의존 | 기초 회화(vol1), 한글 뜻 위주, 말뭉치 천천히 듣기 |

### 2.2 핵심 시나리오 (User Journey)
1. 사용자가 공유 링크로 URL 열기 → 브라우저에서 PWA 접속
2. 온보딩(소리→의미 원리 안내 · 레벨 선택) → "홈 화면에 추가" 가이드 → 설치
3. 홈 → "오늘의 10분 데일리" 또는 학습 경로에서 과 선택
4. 마스터리: Blind 듣기 → Script 확인 → Shadowing → Final Check
5. 모르는 표현은 🔴마킹만 (데일리에서는 단어장 비활성) → 이후 마스터리에서 재학습
6. 완료한 음원은 "편하게 듣기"에서 출근길·설거지용으로 반복 노출
7. 다음날 자발적 재진입 → 스트릭·진도 자동 복원

---

## 3. 기술 스택 (확정)

| 영역 | 선택 | 버전 | 근거 |
|---|---|---|---|
| 빌드 도구 | Vite | ^5.4 | ESM 기반, 빠른 HMR, 작은 번들 |
| 프레임워크 | React | 18.x | 안정성, 생태계 |
| 언어 | TypeScript | ^5.4 | 타입 안전성 |
| 라우팅 | React Router (HashRouter) | ^6.26 | iOS PWA 새로고침 404 회피 |
| 상태 관리 | Zustand | ^4.5 | 가볍고 보일러플레이트 적음 |
| 스타일 | Tailwind CSS | ^3.4 | 유틸리티 우선, 디자인 토큰 |
| PWA | vite-plugin-pwa + Workbox | ^0.20 | Service Worker 자동 생성 |
| 로컬 저장 | idb-keyval | ^6.2 | IndexedDB 간단 래퍼 |
| 녹음 | MediaRecorder (브라우저 내장) | — | 쉐도잉 녹음. 포맷은 `isTypeSupported`로 선택 (WebM/Opus → MP4/AAC) |
| 피치 검출 (**Phase 2**) | Pitchy | — | 성조 파형 비교 도입 시 추가 |
| 마크다운 파서 | unified + remark-parse | latest | .md → JSON 변환 (빌드 타임) |
| 폰트 | **시스템 폰트만** (웹폰트 미사용) | — | 용량 0KB, 한자 폴백 체인 |
| 테스트 | Vitest + Testing Library | ^2.0 | Vite 네이티브 통합 |
| 배포 | **GitHub Pages** | — | 무료 HTTPS, base path `/ChinTalk/` |
| CI | GitHub Actions (`actions/deploy-pages@v4`) | — | main push 시 자동 빌드·배포 |

**번들 목표**: 초기 JS gzip < **100KB** (상한 150KB, §16), 콘텐츠 vol별 chunk, 첫 LCP < 2.5s (3G)

---

## 4. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Repository                                          │
│  ├── Doc/Markdown/vol1/*.md    ← 단일 진실 소스 (20과)      │
│  ├── Doc/Markdown/vol2/*.md                                 │
│  ├── Doc/Markdown/vol3/*.md                                 │
│  ├── Doc/Markdown/vol4/*.md                                 │
│  ├── Doc/Markdown/vol5/*.md                                 │
│  ├── Doc/Markdown/vol6/*.md                                 │
│  ├── Doc/Markdown/vol7/*.md                                 │
│  ├── Doc/Markdown/vol8/*.md                                 │
│  ├── app/scripts/              ← 빌드 타임 변환              │
│  │   ├── build-content.ts      ← .md → vol별 JSON           │
│  │   ├── build-timestamps.ts ← 구절 타임스탬프 정합       │
│  │   ├── build-tts.ts          ← zh 텍스트 → mp3 합성       │
│  │   └── verify-tts-coverage.ts← mp3 누락 검증 게이트       │
│  └── app/src/                  ← React PWA                  │
└─────────────────────────────────────────────────────────────┘
                       │ git push
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions (CI)                                        │
│  1. Doc/Markdown/*.md → app/src/data/lessons-vol*.json      │
│  2. 구절 타임스탬프 정합                             │
│  3. TTS mp3 커버리지 검증 (verify:tts)                      │
│  4. vite build                                              │
│  5. Workbox precache manifest 생성                          │
└─────────────────────────────────────────────────────────────┘
                       │ deploy
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Pages (HTTPS, CDN)                                  │
└─────────────────────────────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  User Device                                                │
│  ├── Browser (Chrome / Safari / Edge)                       │
│  ├── Service Worker (Workbox) ← 오프라인 캐시               │
│  ├── IndexedDB                ← 진도·형광펜·스트릭 상태      │
│  └── SpeechSynthesis API      ← OS 내장 TTS                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 콘텐츠 데이터 모델 & 파이프라인

### 5.1 교재 구성

| 권 | 주제 | 과 수 | 레벨 |
|---|---|---|---|
| **vol1** | 기초 일상 (인사·자기소개·숫자·시간·가족·날씨 등) | 20과 | Lv.1 왕초보 귀 트이기 |
| **vol2** | 생활 회화 (주문·쇼핑·교통·호텔·병원 등) | 20과 | Lv.1 왕초보 귀 트이기 |
| **vol3** | 여행 회화 (항공·입국·관광·환전·긴급상황 등) | 20과 | Lv.2 중국어 벽 뚫기 |
| **vol4** | 비즈니스 회화 (회사·회의·협상·계약·출장 등) | 20과 | Lv.2 중국어 벽 뚫기 |
| **vol5** | 고급·실무 회화 (면접·무역·금융·법률·토론 등) | 20과 | Lv.3 네이티브 리듬 정복 |
| **vol6** | 네이티브 표현 (성어·관용어·속담·儿化·어기사·유머 등) | 20과 | Lv.3 네이티브 리듬 정복 |
| **vol7** | 의사소통 기능 (요청·거절·사과·설득·협상·중재 등) | 20과 | Lv.4 프리토킹 마스터 |
| **vol8** | 시사·논증 (시사 이슈·논증·학술·격식 연설 등) | 20과 | Lv.4 프리토킹 마스터 |

> **레벨 명칭 원칙**: HSK 급수(1~6급)는 한국인 학습자에게 직관적이지 않다. "몇 급"보다 **"귀가 트이는 체감"**을 반영한 명칭을 사용해 동기를 부여한다.
> **vol→level 매핑**: `build-content.ts`의 상수표(vol1·2→Lv.1, vol3·4→Lv.2, vol5·6→Lv.3, vol7·8→Lv.4)로 `level`/`levelName`을 주입한다 (마크다운에는 레벨 정보를 두지 않음).

**과당 표준 구조** (마크다운 소스 순서):

```
第 N 课 : NN. 제목 Pinyin (한국어)
## 本文 (본문)        → 문장 말뭉치 (한자/병음/한글 3줄 단위, 긴 문장은 ／로 구절 분할)
## 主要词汇 (주요 단어) → 과별 핵심 단어 6개
## 相关词汇 (관련 단어 모음) → 주제별 연관 단어 그룹 2~3개 (표)
## 语法点 (어법 포인트) → 문법 패턴 3~4개
## 应用会话 (응용 회화) → 일상 A/B 대화
```

**말뭉치(구절) 분할 원칙**: 본문·회화는 **문장 → 구절(Chunk) 2단계**로 나뉜다.
- **문장**: `한자 줄 → 병음 줄 → 한국어 줄` 3줄 그룹 (기본 재생 단위)
- **구절(Chunk)**: 문장 안의 자연 호흡 단위. 긴 문장은 `／` 구분자로 분할하며, 3줄 모두 같은 위치에 `／`를 넣어 정렬한다.

```
我今天下午／要去图书馆／借一本书。  
Wǒ jīntiān xiàwǔ／yào qù túshūguǎn／jiè yì běn shū.  
오늘 오후／도서관에 가서／책 한 권을 빌려요.
```

**부가 메타데이터 (빌드타임 자동 산출)**: 각 과에 다음을 부여한다.
- `durationSec` — 과 전체 음원 길이 (TTS 합성 후 산출)
- `chunks[].startMs/endMs` — 구절별 오디오 타임스탬프 (Chunking 엔진이 매핑)
- `passiveTags` — 편하게 듣기 큐레이션 태그 (예: `["출근길", "설거지", "자장가"]`)
- `traps` — 한국인 발음 함정 항목. **2계층 구조**:
  - **공통 함정 DB** (`Doc/Traps/common-traps.md`, 약 30개): q·x·zh·ch·sh·r, 3성 변조, 경성, 儿化 등 음소 단위. 과에서는 `trapIds`로 참조만 한다
  - **과별 고유 함정**: vol1~2(Lv.1)부터 원어민 검수 후 등록. 검수 전 과는 `traps: []`로 두며 팝업 UI가 없는 상태를 정상으로 처리
  - **출시 게이트**: 공통 함정 DB 완성 + vol1 과별 함정 검수 완료 (전 과 완비는 게이트 아님)

### 5.2 마크다운 → JSON 변환

`scripts/build-content.ts`가 `Doc/Markdown/vol*/*.md`를 읽어 다음 구조로 변환:

```ts
// app/src/types/lesson.ts
export type Chunk = {
  id: string;           // 안정 ID: `${lessonId}_${sha1(zh).slice(0,8)}` — 순서 변경에도 형광펜·즐겨찾기 유지
  zh: string;           // 구절 한자
  pinyin: string;       // 구절 병음
  ko: string;           // 구절 한글
  startMs?: number;     // 오디오 타임스탬프 (Chunking 엔진 매핑)
  endMs?: number;
  trapIds?: string[];   // 발음 함정 참조
};

export type WordToken = {
  zh: string;           // "谢谢"
  pinyin: string;       // "xièxie"
  start: number;        // 한자 문자열 내 시작 인덱스 (단어 탭 감지용)
  end: number;          // 한자 문자열 내 끝 인덱스
};

export type Verse = {
  zh: string;           // 한자 (문장 전체)
  pinyin: string;       // 병음
  ko: string;           // 한글 번역
  chunks?: Chunk[];     // `／` 구분자 기준 구절 분할, 없으면 문장=1구절
  words?: WordToken[];  // 병음 띄어쓰기 기반 단어 토큰 (빌드타임 한자 정렬)
};

export type PronunciationTrap = {
  id: string;           // "vol1_01_t1"
  target: string;       // "q", "和", "r", "zh"
  zh: string;           // 예시 한자 "去"
  pinyin: string;       // "qù"
  ko: string;           // "q는 '츄'가 아님"
  note: string;         // 발음 방법 (혀 위치·조음점 등)
};

export type WordSense = {
  pos?: string;         // "형용사", "부사" (품사)
  meaning: string;      // "좋다"
  example?: Verse;      // 해당 뜻의 예문
};

export type WordCard = {
  word: string;         // "好"
  pinyin: string;       // "hǎo"
  senses: WordSense[];  // 뜻 1, 2, 3, ... (다의어 번호 매김)
  hanjaNote?: string;   // 한자 풀이 (주요 단어에 있을 때)
  trap?: PronunciationTrap; // 발음 함정 (있으면 💡 병기)
};

export type VocabEntry = {
  id: string;            // "vol1_01_v1"
  word: string;          // "你"
  pinyin: string;        // "nǐ"
  pos: string;           // "대명사 (pron.)"
  meaning: string;       // "너, 당신"
  hanjaNote?: string;    // 한자 풀이
  example?: Verse;       // 예문
};

export type RelatedVocabRow = {
  hanzi: string;
  pinyin: string;
  ko: string;
};

export type RelatedVocabGroup = {
  titleKo: string;               // "시간 (시간)"
  rows: RelatedVocabRow[];       // 4~6개
};

export type GrammarPoint = {
  pattern: string;               // "A 是 B"
  meaningKo: string;
  examples: Verse[];
  note?: string;                 // 부정/의문 등
};

export type DialogLine = {
  role: string;                  // "A", "B"
  lines: Verse[];
};

export type Lesson = {
  id: string;                    // "vol1_01"
  vol: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  no: number;                    // 1~20
  level: 1 | 2 | 3 | 4;         // Lv.1 왕초보 / Lv.2 벽 뚫기 / Lv.3 리듬 정복 / Lv.4 프리토킹
  levelName: string;             // "왕초보 귀 트이기"
  titleZh: string;
  titlePinyin: string;
  titleKo: string;
  durationSec: number;           // 과 전체 음원 길이 (빌드타임 산출)
  passiveTags: string[];         // ["출근길", "설거지", "자장가"]
  traps: PronunciationTrap[];    // 한국인 발음 함정
  body: Verse[];                 // ## 本文
  vocab: VocabEntry[];           // ## 主要词汇 (6개)
  relatedVocab: RelatedVocabGroup[]; // ## 相关词汇 (2~3그룹)
  grammar: GrammarPoint[];       // ## 语法点
  dialog: DialogLine[];          // ## 应用会话
};

export type ContentBundle = {
  buildHash: string;             // 콘텐츠 버전 해시
  lessons: Lesson[];             // 100개
};
```

### 5.3 파서 규칙
- 소스 디렉터리: `Doc/Markdown/vol1/` ~ `Doc/Markdown/vol8/`
- 첫 줄(제목줄) `第 N 课 : NN. 제목 Pinyin (한국어)` → `titleZh/titlePinyin/titleKo/no/vol`
- 헤더 `## 本文 (본문)` → `body` (3줄 패턴을 `Verse`로 묶음)
- 헤더 `## 主要词汇 (주요 단어)` → `### N. word / pinyin / [품사] / 뜻` 블록 6개를 `vocab[]`로
- 헤더 `## 相关词汇 (관련 단어 모음)` → `### 그룹명` + 표(`| 한자 | 병음 | 한국어 |`)를 `relatedVocab[]`로
- 헤더 `## 语法点 (어법 포인트)` → `### N. 패턴` 하위 예문을 `grammar[]`로
- 헤더 `## 应用会话 (응용 회화)` → `A:/B:` 발화 블록을 `dialog[]`로

### 5.4 빌드 산출물
- `app/src/data/lessons-vol1.json` (20과) ~ `lessons-vol8.json` (20과)
- `app/src/data/lessons-meta.json` (160과 타이틀만, ≈ 20KB)
- `app/src/data/zh-timestamps.json` (문장 mp3 내 구절 `startMs/endMs` 정합 결과)
- `app/src/data/zh-tts-manifest.json` (zh 텍스트 → mp3 파일명 해시 매핑)
- `app/src/data/word-dict.json` (단어 사전 — 탭하여 단어장 팝업용, §5.6 참조)
- `app/public/tts/*.mp3` (SHA-1 해시 파일명, **문장 통합 mp3 + 구절 mp3** 각각)
- ※ vol2~8 JSON은 JS 번들에 import하지 않고 정적 에셋(`public/data/`)으로 `fetch` 로드 → precache에서 제외 (§10.1)

### 5.5 TTS 음성 에셋 파이프라인

학습 콘텐츠의 모든 zh 텍스트(말뭉치 청크 단위)는 **빌드 타임에 mp3로 사전 합성**되어 정적 에셋으로 커밋된다. 런타임 Web Speech API가 아닌 정적 mp3 재생을 기본으로 하여 오프라인·일관된 발음 품질을 보장한다.

**스크립트**:
- `build-tts.ts` — `lessons-vol*.json`에서 모든 zh 텍스트 수집 → **문장(통문장)·구절 각각** `msedge-tts`로 mp3 합성 → `public/tts/{sha1}.mp3` 저장 → `zh-tts-manifest.json` 갱신
- `verify-tts-coverage.ts` — 콘텐츠에 추가된 zh 텍스트 중 mp3 누락을 검출하여 비-0 종료. `build:all`의 마지막 게이트
- `tts-texts.ts` — 두 스크립트가 공유하는 텍스트 수집·해시 로직의 단일 진실 소스

**흐름**:
```
Doc/Markdown/vol*/*.md → build-content.ts → lessons-vol*.json
                                               │
                              ┌────────────────┘
                              ▼
                      build-tts.ts ──→ public/tts/{sha1}.mp3
                              │        zh-tts-manifest.json
                              ▼
                      verify-tts-coverage.ts (게이트)
```
**운영 원칙**:
- mp3는 저장소에 커밋되는 정적 자산 (CI에서 합성하지 않음)
- **TTS 엔진 정책**: 무료 `msedge-tts`(Edge 읽어주기 비공식 엔드포인트) 사용. 공식 허가·SLA가 없는 회색지대이므로 (1) **빌드 타임에 1회만 합성**해 mp3를 커밋하고 런타임 호출 없음, (2) 무료·비상업 공개 유지, (3) 음성명(예: `zh-CN-XiaoxiaoNeural`)을 manifest에 기록, (4) 엔드포인트 변경·중단 시에도 이미 합성한 mp3는 영향 없음, (5) 수익화 전에는 Azure AI Speech로 재합성할 수 있도록 `build-tts.ts`를 엔진 교체 가능하게 둔다
- 콘텐츠 추가 시 `npm run build:tts -- --phase all` 로 mp3 합성 후 함께 커밋
- `npm run build:all` = `build:content && build:timestamps && verify:tts` (verify 실패 시 빌드 중단). CI(§17)도 동일 순서
- **용량 추정(합성 후 실측으로 확정)**: 구절 mp3 약 6~10KB, 160과 × (문장 약 12 + 구절 약 30) ≈ 6,500~8,000개 → 약 50~80MB. 48kbps mono 인코딩(msedge-tts 출력 포맷) 고정 — **vol1 실측: 576개 / 6.77MB(개당 약 12KB)**, 전체 8권 약 55MB 예상, 재합성 최소화(git 히스토리 팽창 방지), GitHub Pages 1GB 한도 이내 관리
- **실측 절차**: 출시 전 vol1(20과)을 먼저 합성해 KB/과를 실측 → 160과로 환산해 §5.5·§16 수치 확정. 저장소 한도(1GB)에 근접하면 vol별 별도 저장소 또는 Release 에셋으로 분리

### 5.6 단어장 파이프라인 (탭 → 단어 사전 팝업)

**파고다 앱 스타일**: 본문·회화에서 단어를 탭하면 해당 단어의 사전 카드(단어장)가 바텀시트로 열린다.

**핵심 원리**: 중국어는 띄어쓰기가 없지만, 콘텐츠의 **병음 줄이 이미 단어 단위로 띄어쓰기**되어 있어 단어 경계가 자동 확보된다. 빌드타임에 병음 토큰을 한자 문자와 정렬하면 `Verse.words[]`(WordToken)가 만들어진다.

```
"我很好，谢谢。"
"Wǒ hěn hǎo, xièxie."   ← 단어 경계 내포
        │ 정렬
        ▼
words: [我(wǒ) 很(hěn) 好(hǎo) 谢谢(xièxie)]
```

**파이프라인**:
1. `build-content.ts`가 각 Verse의 병음을 공백으로 분리 → 한자 인덱스와 정렬해 `words[]` 생성
2. 과별 `主要词汇`(6개) + `相关词汇`(그룹표)에서 과에 등장하는 단어 목록을 추출 → **탭 가능 단어 집합** 구성
3. `Doc/Dictionary/` 공통 사전에서 각 단어의 **다의어(多义) 뜻풀이**를 조회해 매핑 → `word-dict.json` (CC-CEDICT 기반 한국어 뜻풀이 재작성, 이 파일만 CC BY-SA 4.0, 출처 표기 의무 §1.5)

**런타임 동작**:
- 본문/회화의 한자를 단어 토큰 단위로 렌더 (span)
- 단어 탭 → 해당 단어를 `word-dict.json`에서 조회 → 단어장 바텀시트 표시
- 사전에 없는 단어는 문장의 병음에서 추출한 병음만 표시

**단어장 바텀시트 UI** (다의어는 번호로 매김):
```
┌──────────────────────────┐
│  ═══ (드래그 핸들)         │
│        好               │  ← 한자 (28px)
│        hǎo              │  ← 병음
│  1. [형용사] 좋다        │  ← 뜻 1 (품사·뜻)
│     例) 今天天气很好。    │
│  2. [부사] 잘, 퍽        │  ← 뜻 2
│  3. [동사] 좋아하다      │  ← 뜻 3
│  ─ 한자 풀이 ─          │
│   女(계집녀)+子(아들자)  │
│  💡 3성 — 목 낮췄다 올림 │  ← 발음 함정
│                          │
│   🔊 듣기   ⭐ 즐겨찾기   │  ← 하단 액션
└──────────────────────────┘
```
- **다의어(多义) 번호 매김**: 하나의 단어가 여러 뜻을 가질 때 `1. 2. 3.` 순으로 표시 (사전 스타일). 각 뜻은 품사·뜻·예문을 가질 수 있다.
- 바깥 탭/아래로 스와이프로 닫기
- 🔴북마크(3색 형광펜) 연동 — "모르는 단어"로 즉시 저장 가능

> **다의어 데이터 소스**: 과별 `主要词汇`(과 맥락의 단일 뜻)·`相关词汇`은 "이 과에서 쓰인 뜻"만 담는다. 반면 **단어장 사전(`word-dict.json`)은 별도로 다의어 뜻풀이를 갖춘 사전 데이터**를 사용한다(CC-CEDICT 기반 한국어 뜻풀이 재작성, 이 파일만 CC BY-SA 4.0, 출처 표기 의무 §1.5). 단어 탭 시 이 사전에서 모든 뜻을 번호로 표시하고, 과에서 쓰인 뜻은 하이라이트한다.

**공통 사전(`Doc/Dictionary/dict-*.md`) 포맷**:
```markdown
### 好 hǎo
- 한자 풀이: 女(계집녀) + 子(아들자) → 자녀가 곁에 있어 "좋다"
- 발음 함정: 3성 — 목을 낮췄다 올림
1. [형용사] 좋다 — 今天天气很好。
2. [부사] 잘, 퍽
3. [동사] 좋아하다
4. (인사) 안녕
```
→ `WordCard { word:"好", pinyin:"hǎo", senses:[{pos, meaning, example}...], hanjaNote, trap }`로 파싱.

---

## 6. 화면 명세 (Screen Specs)

### 6.1 화면 목록

| ID | 화면명 | 우선순위 | 경로 (HashRouter, `#` 생략) | 핵심 |
|---|---|---|---|---|
| S-001 | 홈 (Home) | P0 | `/` | 스트릭 + 오늘의 데일리 CTA + 이어 학습 + 달성률 |
| S-002 | 온보딩 (Onboarding) | P0 | `/onboarding` | 소리→의미 안내 · 레벨 선택 · 마이크 안내 |
| S-003 | 학습 경로 (Learning Path) | P0 | `/path` | Lv.1~4 레벨별 과 목록 |
| S-004 | 과 참고 (Script Reference) | P0 | `/lesson/:id` | 스크립트·단어·관련단어·어법·회화 (읽기·참고용) |
| S-005 | 4단계 마스터리 (Deep Mastery) | P0 | `/lesson/:id/mastery` | Mode 1 · Blind→Script→Shadowing→Final |
| S-006 | 10분 데일리 (Daily Routine) | P0 | `/daily` | Mode 2 · 타이머 6단계 |
| S-007 | 편하게 듣기 (Passive Listening) | P1 | `/passive` | 해금 음원 백그라운드 재생 |
| S-008 | 설정 (Settings) | P0 | `/settings` | 글자·음성·오프라인 음원·저장공간 |
| S-009 | 정보 (About) | P0 | `/about` | 출처·개인정보·오픈소스 |
| S-010 | 설치 안내 모달 (Install Prompt) | P0 | overlay | 온보딩 완료 후 표시 |

> **제외 확정(v1.3에서 일부 번복: §6.6 못한 문장 복습)**: 검색(Search)·전체 어휘 플래시카드·SRS — 듣기 중심 앱에서 비핵심. 복습은 🔴마킹(3색 형광펜) + 편하게 듣기로 대체. 관련 설계(MiniSearch·Leitner·SRS 스토어)는 본 문서에서 모두 제거했다.
> **ID 규칙**: 위 S-ID는 §6·§13·§19에서 동일하게 사용한다. 경로는 HashRouter 기준이며 실제 URL은 `/ChinTalk/#/lesson/vol1_01` 형태다.
> **배치 순서**: §6.2~§6.11은 S-001~S-010 순서로 배치했다.

### 6.2 S-001 홈

```
┌──────────────────────────────────┐
│  ☰  ChinTalk 中国语会话       ⚙  │  ← 상단바
├──────────────────────────────────┤
│  🔥 연속 학습 7일                 │  ← 스트릭 배지
│                                  │
│  ╭────────────────────────╮      │
│  │ 오늘의 한 마디          │      │  ← 날짜 기준 고정 선택
│  │ 你好！  Nǐ hǎo!        │ 🔊  │
│  │ 안녕하세요!             │      │
│  ╰────────────────────────╯      │
│                                  │
│  ▶ 오늘의 10분 데일리             │  ← 추천 과 표시, 탭 시 S-006
│    추천: Vol.1 · 02과 · 自我介绍  │
│                                  │
│  ▶ 이어 학습하기 (마스터리 3단계) │  ← 마지막 마스터리 과
│                                  │
│  🎨 이해도 달성률                 │
│  🟢 62%  🟡 25%  🔴 13%          │  ← 3색 형광펜 집계
│                                  │
│  📚 학습 경로                    │
│  [Lv.1][Lv.2][Lv.3][Lv.4]        │
│  🎧 편하게 듣기 (해금 12곡)       │
│                                  │
│  [홈][경로][데일리][듣기][설정]   │  ← 하단 탭바 5개
└──────────────────────────────────┘
```

**컴포넌트**: `<StreakBadge>`, `<SentenceOfDay>`, `<DailyCta>`, `<ContinueCard>`, `<HighlightRate>`, `<LevelTiles>`, `<PassiveEntry>`, `<BottomNav>`

### 6.3 S-002 온보딩 (Onboarding)

첫 진입 1회만 표시. 설정에서 다시 볼 수 있다. 심리 허들을 낮추는 핵심 진입점.

| 슬라이드 | 내용 |
|---|---|
| 1 | **"눈이 아니라 귀로"** — 소리→의미 직결 원리, 3대 고통(한글 해독 의존·성조 무너짐·3일 포기) 해소 약속 |
| 2 | **레벨 선택** — Lv.1 왕초보 귀 트이기 / Lv.2 중국어 벽 뚫기 / Lv.3 네이티브 리듬 정복 / Lv.4 프리토킹 마스터. 선택은 데일리 첫 추천 과의 기준 |
| 3 | **마이크 안내** — 쉐도잉에 필요함을 설명만 하고, **실제 권한 요청은 쉐도잉 최초 진입 시점**에 수행. 거부해도 학습 진행 가능(입모양 따라 하기 폴백) |

- 건너뛰기 가능. 완료/건너뛰기 시 `settings.onboarded = true`
- 설치 안내 모달(S-010)은 온보딩 종료 이후에만 표시

### 6.4 S-003 학습 경로 (Learning Path)

- 상단 탭: Lv.1 (vol1·2) / Lv.2 (vol3·4) / Lv.3 (vol5·6) / Lv.4 (vol7·8) — 각 40과
- 각 과 행: `01. 问候 · 인사` + 마스터리 단계 배지(Blind~Final) + 형광펜 달성률 미니바 + ⭐ + 🎧(해금 시)
- 행 탭 → S-004 과 참고. 행 우측 [🎯 마스터리] → S-005
- 우측 진도 도넛 (레벨별 % + 전체 %)
- 진도 기준: **마스터리 완료(Final Check 제출)한 과** / 읽기만 한 과는 별도 표시(○)

### 6.5 S-004 과 참고 (Script Reference) — 읽기·참고용

```
┌──────────────────────────────────┐
│ ← 01. 问候 (인사)                │
│   Wènhòu                         │
├──────────────────────────────────┤
│ [본문][단어][관련단어][어법]      │  ← 가로 스크롤 탭
│ [회화]                           │
├──────────────────────────────────┤
│ 표시 모드: [🔘 전체] [한자+병음] │
│           [한자만]               │
├──────────────────────────────────┤
│ ╭────────────────────────╮  🔊  │
│ │ 你好！                 │      │  ← 말뭉치 청크 1
│ │ Nǐ hǎo!               │      │
│ │ 안녕하세요!            │      │
│ ╰────────────────────────╯      │
│                                  │
│ ╭────────────────────────╮  🔊  │
│ │ 早上好！               │ ⭐  │  ← 말뭉치 청크 2
│ │ Zǎoshang hǎo!         │      │
│ │ 좋은 아침입니다!        │      │
│ ╰────────────────────────╯      │
│ ...                              │
│                                  │
│ [◀ 이전 과]  [다음 과 ▶]        │
└──────────────────────────────────┘
```

**상호작용**:
- 🔊 단일 탭: 해당 말뭉치(중국어) 한 번 재생
- 🔊 길게 누름(>500ms): 한국어 번역 재생
- 카드 더블탭: 즐겨찾기 토글
- 우측 상단 ▶▶: 본문 전체 자동 연속 재생 모드 (말뭉치 순서대로)
- 단어/관련단어 행 탭 시 발음 재생, ⭐ 즐겨찾기 토글
- 상단 [🎯 4단계 마스터리 시작] 버튼 → S-005
- 본문·회화의 한자 단어 탭 → 단어장 바텀시트(§5.6), 🔴마킹·⭐ 연동
- 스크롤 70% 이상 도달 시 **"읽기 완료"** 표시 (`progress.completed`). ※ 해금(§12.3)과 무관 — 해금은 마스터리/데일리 완료 기준
- 좌우 스와이프로 이전/다음 과 이동

**섹션 탭**:
- **본문**: `body[]` 말뭉치 카드 스택
- **단어**: `vocab[]` 6개 (한자 풀이·예문 포함)
- **관련단어**: `relatedVocab[]` 그룹별 표 렌더, 행 탭 시 발음
- **어법**: `grammar[]` 패턴 + 예문
- **회화**: `dialog[]` A/B 말풍선 스타일

### 6.6 S-005 심화 학습 (Deep Study, 구 4단계 마스터리) — 사용자 주도

**목적**: 하나의 짧은 음원(과의 본문 / 회화 / 본문+회화)을 앉아서 깊이 익히는 정밀 학습. 출퇴근 전용이 아닌 **자리에 앉아 하는 학습**이다. 라우트 `/lesson/:id/mastery` 유지.

**4단계 흐름**:

| 단계 | 명칭 | 동작 | 핵심 인터랙션 |
|---|---|---|---|
| 1 | **듣고 이해** | 자막 없이 중국어를 듣고 알맞은 한글 뜻 고르기 | 4지선다 퀴즈(최대 10문항, 자동 채점). 오답 문장은 🔴 북마크 |
| 2 | **한글 보고 떠올리기** | 플래시카드. 앞면 한글 → 중국어를 떠올려 말함 → 뒤집어 한자·병음·한글 + 원문 음성 | 큰 **맞음/못함** 자기 채점 |
| 3 | **간체 보고 떠올리기** | 앞면 간체 → 뜻을 떠올림 → 뒤집어 병음·한글 확인 | 맞음/못함, 다시 도전 가능 |
| 4 | **따라 말하기** | 문장 단위 녹음 → 내 소리 → 원문과 번갈아 듣기 | 녹음 기반(§9.6 Phase 2: 성조 파형 비교). 마지막 단계 |

**떠올리기 규칙**(한글 보고 / 간체 보고 두 단계 공통):
- 순서: 본문은 무작위, 회화는 교재 순서(본문+회화는 본문 무작위 → 회화 순서). 각 단계는 끝난 뒤 **다시 도전**할 수 있다. 두 단계를 모두 마치면 마스터리를 저장한다.
- 카드는 5장씩 묶음으로 진행한다.
- 못함 → 원문을 듣고 1회 따라 말한 뒤 **추가 학습 더미**로 이동. 더미는 섞어서 반복하며, 맞음이면 더미에서 제외, 못함이면 2회 따라 말하고 더미에 남는다.
- **완료 기준**: 더미가 모두 비면 완료 → `markMastered(lessonId, score, source)`, 편하게 듣기 해금·스트릭 갱신(§12.3).
- **나중에 하기**: 남은 카드를 `chintalk-review.pending`에 저장하고 다음에 이어서 한다.
- 떠올리기는 마이크를 쓰지 않는다(녹음·내 소리·번갈아 듣기 없음). 소리 내어 말한 뒤 버튼으로 진행한다.

**점수**: 퀴즈 정답률 50% + 떠올리기 **첫 시도** 정답률 50% (0~100). 추가 학습 성공은 점수에 더하지 않는다. **80점 이상 = 마스터**. 퀴즈를 건너뛴 대상(문장이 적음)은 떠올리기 100%.

**약점 처리**: 퀴즈 오답 + 첫 시도 못함 문장은 해당 구절의 Chunk를 🔴 빨강으로 마킹한다(우선 재학습).

**복습(SRS, 2차 — 날을 넘기는 복습)**: 첫 시도에서 못함인 문장은 `chintalk-review.cards`에 등록되어 **1일 → 3일 → 7일** 간격으로 `/review`(복습)에 플래시카드로 다시 나온다. 맞으면 다음 단계, 7일 단계까지 맞히면 졸업, 틀리면 1일 단계로 돌아간다. 홈·학습 메뉴에 "오늘의 복습 N장"을 표시한다. (§1 이전의 "SRS 제외" 결정을 이 범위로 한정해 번복: 전체 어휘 SRS·검색은 여전히 제외.)

**데이터**: `Lesson.traps[]`, `Lesson.body[].chunks[]`, `zh-tts-manifest.json` + `zh-timestamps.json`. 신규 스토어 `useReviewStore`(persist `chintalk-review`: `cards{lessonId,zh,box,due}`, `pending`), 순수 로직 `lib/srs.ts`, `lib/recall.ts`, `lib/quiz.ts`, 컴포넌트 `RecallDeck`.
**단어장**: 과 참고(S-004)에서 단어 탭 → 단어장 바텀시트 활성(§5.6). 🔴 마킹 단어는 재학습 시 우선 노출.

### 6.7 S-006 10분 데일리 루틴 (Daily Routine) — 시스템 주도

**목적**: 출퇴근·자투리 시간에 매일 소리에 노출되는 습관 형성. 타이머 기반 자동 전환 + 부드러운 진행 알림.

```
┌──────────────────────────────────┐
│  🎧 10분 데일리   남은 시간 08:12│
├──────────────────────────────────┤
│  ● ○ ○ ○ ○ ○                     │
│  [1분] 음원 전체 듣기 (자막 없음) │
│  ▓▓▓▓ (블러)              🔊     │
│                                  │
│  [다음 단계: 스크립트 보며 듣기]  │
│  ████████░░░░░░░░░░ 1/6          │
│                                  │
│  [일시정지] [건너뛰기]            │
└──────────────────────────────────┘
```

**6단계 타이머 시퀀스** (총 10분):

| 시간 | 단계 | 내용 |
|---|---|---|
| 1분 | 워밍업 | 음원 전체 듣기 (자막 없음) |
| 1분 | 스크립트 | 스크립트 보며 다시 듣기 (Chunk 하이라이트) |
| 2분 | 표현 확인 | 모르는 표현 → **탭하여 🔴북마크만** (이 단계에서는 단어장 비활성, 좌절 방지) |
| 2분 | 리듬 따라가기 | 소리 덩어리(Chunk) 의미 파악 + 리듬 따라 읽기 |
| 2분 | 쉐도잉 | 문장별 쉐도잉 (간단 녹음 또는 입술 움직임) |
| 2분 | 마무리 | 자막 없이 최종 재청취 + 완료 축하 |

**원칙**:
- 단계 간 전환은 타이머 자동 + "다음 단계: X" 부드러운 하단 토스트
- 🔴북마크는 나중에 모드1(Deep Mastery)에서 정밀 학습할 대상으로 자동 수집
- 매일 완료 시 연속 학습(스트릭) 배지 갱신
- **음원 선택**: 자동 추천(§12.4) — 진행 중 과 → 다음 미완료 과 → 첫 사용 시 온보딩에서 고른 레벨의 첫 과. 시작 전 사용자가 변경 가능
- **시간 맞춤**: 단계 길이는 **타이머가 기준**. 음원이 짧으면 문장·구절 단위로 반복 순환, 길면 문장 단위로 잘라 사용 (과 전체를 끝까지 듣지 않아도 됨)
- **🔴북마크 = 형광펜 red 마킹**과 동일 데이터(`useHighlightStore`)로 통일
- **완료 기준**: 6단계가 모두 종료(건너뛰기 허용)되면 해당 과 해금 + 스트릭 갱신 (§12.3)
- **단어장 정책**: "표현 확인" 단계에서는 단어 탭이 🔴마킹만 수행하고 단어장 바텀시트는 열리지 않는다(뜻 찾기로 2분이 소진되어 "한글 해독 의존"으로 돌아가는 것 방지). 나머지 단계는 단어장 열람 가능. 🔴 단어는 마스터리 재학습 시 단어장으로 우선 노출

### 6.8 S-007 편하게 듣기 (Passive Listening)

**해금 조건**: 마스터리(Final Check 제출) 또는 데일리(6단계 종료)를 **완료한 과의 음원만** 재생 가능 (규칙 §12.3). → "이미 익숙한 소리"를 배경으로 반복 노출.

- **상황별 큐레이션**: 🎧출근길 지하철용 / 🎧설거지·청소용 / 🎧잠들기 전 자장가용
- **백그라운드 재생**: Media Session API + **mp3 재생 전용**(Web Speech 폴백 금지). 플랫폼 한계는 §9.7
- **오프라인 재생**: 해당 vol mp3를 설정(S-008)에서 다운로드한 경우에 한함
- **반복 모드**: 단일 음원 반복 / 전체 플레이리스트 순차 / 랜덤
- **플레이리스트**: 해금된 음원을 `passiveTags` 기준으로 자동 구성

### 6.9 S-008 설정

| 설정 | 옵션 | 기본값 |
|---|---|---|
| 글자 크기 | 작게(90%) / 보통(100%) / 크게(120%) / 매우 크게(140%) | 보통 |
| 다크 모드 | 시스템 / 라이트 / 다크 | 시스템 |
| 표시 모드 기본값 | 전체 / 한자+병음 / 한자만 | 전체 |
| TTS 음성 (zh-CN) | 사용 가능 보이스 목록 | OS 기본 |
| TTS 음성 (ko-KR) | 사용 가능 보이스 목록 | OS 기본 |
| TTS 속도 | 0.5× ~ 1.5× (슬라이더) | 0.9× |
| 자동 연속 재생 간격 | 0.5s ~ 3s | 1.0s |
| 끊어 읽기 구절 간격 | 0.4s ~ 2s | 0.8s |
| 음성 모드 | 사전 합성 mp3 우선 / 단말기 TTS | mp3 우선 |
| **오프라인 음원** | vol별 다운로드·삭제 (용량 표시, 진행률) | vol1 과 단위 prefetch만 |
| 온보딩 다시 보기 | — | — |
| **저장공간 사용량** | 앱셸/콘텐츠/음원(mp3)/IndexedDB 항목별 KB 표시 (`navigator.storage.estimate()`) | 실시간 |
| **캐시 정리** | Cache Storage만 비움 (진도·즐겨찾기 보존) | — |
| **전체 초기화** | Cache + IndexedDB 모두 삭제, 첫 진입 상태로 | — |
| 캐시 상태 / 업데이트 | 현재 버전 표시, "업데이트 확인" | — |
| 정보 | 버전, 라이선스 → About 페이지 이동 | — |

### 6.10 S-009 정보 (About)

```
┌──────────────────────────────────┐
│ ← 정보                           │
├──────────────────────────────────┤
│  [ChinTalk 아이콘]               │
│  ChinTalk 中国语会话              │
│  v1.0.0 · 빌드 2026-11-05        │
│                                  │
│  ──────────────────────────      │
│  콘텐츠 출처 및 이용 안내        │
│                                  │
│  본 애플리케이션에서 제공하는    │
│  모든 회화·어휘·병음·문법 설명은 │
│  표준 중국어(普通话)의 공개      │
│  체계를 기반으로 AI(DeepSeek)의  │
│  도움을 받아 제작하고 직접       │
│  검수·편집했습니다.              │
│                                  │
│  앱 코드: MIT 라이선스           │
│                                  │
│  단어장 사전 파일만 CC-CEDICT를  │
│  바탕으로 한 CC BY-SA 4.0        │
│  (수정됨, 출처 링크 · 동일조건). │
│                                  │
│  ──────────────────────────      │
│  ⓘ 사용된 오픈소스              │
│     React, Vite, Workbox 등      │
│                                  │
│  ── 개인정보 안내 ──             │
│  본 앱은 어떠한 사용자 정보도    │
│  외부로 전송하지 않습니다.       │
│  모든 학습 기록은 사용자 기기    │
│  내부에만 저장됩니다.            │
│                                  │
└──────────────────────────────────┘
  © ChinTalk. 학습용 무료 앱 · AI 보조
  제작, 직접 검수·편집
```

### 6.11 S-010 설치 안내 모달

- iOS Safari 감지 시: "공유 → 홈 화면에 추가" 시각적 가이드
- Android Chrome: `beforeinstallprompt` 이벤트로 네이티브 설치 UI 트리거
- "다시 보지 않기" 옵션, 7일 후 재표시
- 온보딩(S-002) 완료 이후에만 표시

---

## 7. 디자인 시스템

### 7.1 컬러 토큰

```css
/* Light mode */
--color-bg:           #FAFAFA;
--color-surface:      #FFFFFF;
--color-text:         #1F2937;
--color-text-muted:   #6B7280;
--color-primary:      #7C3AED;  /* 보라 — 회화·말하기 자신감 */
--color-primary-soft: #EDE9FE;
--color-accent:       #F59E0B;  /* 즐겨찾기·강조 */
--color-success:      #10B981;
--color-divider:      #E5E7EB;
--color-pinyin:       #4B5563;  /* 본문보다 옅게 */

/* Dark mode */
--color-bg:           #0F172A;
--color-surface:      #1E293B;
--color-text:         #F1F5F9;
--color-text-muted:   #94A3B8;
--color-primary:      #A78BFA;
--color-primary-soft: #2E1065;
--color-accent:       #FBBF24;
--color-success:      #34D399;
--color-divider:      #334155;
--color-pinyin:       #CBD5E1;
```

### 7.2 타이포

| 용도 | 크기 (기본 100%) | weight |
|---|---|---|
| 본문 한자 | 22px | 500 |
| 본문 병음 | 16px | 400 (italic) |
| 본문 한글 | 16px | 400 |
| 회화 말풍선 한자 | 20px | 500 |
| 제목(H1) | 24px | 700 |
| 제목(H2) | 20px | 600 |
| 캡션 | 13px | 400 |

**큰글씨 모드**: CSS 변수 `--font-scale` 적용 (0.9 / 1.0 / 1.2 / 1.4 — 설정 §6.9의 4단계와 동일) → 모든 폰트 사이즈에 곱셈.

**폰트 패밀리 (웹폰트 0KB 정책)**:
```css
--font-sans:
  system-ui, -apple-system, "Segoe UI", Roboto,
  "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕",
  "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
  "Noto Sans SC", sans-serif;

--font-pinyin:
  -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

**원칙**: 웹폰트 다운로드 금지 — 모든 OS에 한자 시스템 폰트가 이미 존재. 추가 네트워크 0KB.

### 7.3 간격 / 라운드

- spacing scale: 4, 8, 12, 16, 24, 32px
- radius: card 12px, button 8px, chip 999px
- shadow: `0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)`

### 7.4 모션

- 카드 진입: 200ms ease-out fade-up
- 카드 뒤집기: 300ms cubic-bezier(0.4, 0, 0.2, 1) rotateY
- prefers-reduced-motion 존중 → 모션 제거

### 7.5 글로벌 레이아웃 (Footer 의무)

**모든 페이지 하단에 Footer 표시** (`<Footer />` 컴포넌트):

```tsx
// app/src/components/Footer.tsx
export function Footer() {
  return (
    <footer className="text-center text-xs text-muted py-4 px-4
                       border-t border-divider mt-8 mb-[calc(64px+env(safe-area-inset-bottom))]">
      © ChinTalk. 학습용 무료 앱 · AI 보조로 제작하고 직접 검수·편집했습니다.
    </footer>
  );
}
```

- 하단 탭바(`BottomNav` 64px)와 겹치지 않도록 margin-bottom 합산
- 모바일·데스크톱 동일하게 표시
- Footer 텍스트 자체에 About 페이지(`/about`)로 가는 링크 wrapping

---

## 8. 상태 관리 (Zustand stores)

```ts
// stores/useSettingsStore.ts
{ fontScale, theme, displayMode, voiceMode: 'recorded'|'device', ttsVoiceZh, ttsVoiceKo,
  ttsRate, autoplayGap, chunkGap, level: 1|2|3|4, onboarded, installPromptDismissedAt }

// stores/useProgressStore.ts
{ completed: Set<lessonId>   // 읽기 완료(S-004), scrollPositions: Record<id, number>, lastLessonId }

// stores/useFavoriteStore.ts
{ chunks: Set<chunkId>, words: Set<wordId> }

// stores/useHighlightStore.ts   (3색 형광펜, 🔴북마크 겸용)
{ marks: Record<chunkId, "green" | "yellow" | "red"> }

// stores/useMasteryStore.ts     (4단계 마스터리)
{ stage: Record<lessonId, 1|2|3|4>, selfRating: Record<lessonId, 1|2|3|4|5>,
  masteredAt: Record<lessonId, localDate> }

// stores/useDailyStore.ts       (10분 데일리)
{ todayLessonId, log: Record<localDate, { lessonId, completedSteps: number, done: boolean }> }

// stores/useStreakStore.ts      (연속 학습)
{ streakDays: number, lastDoneDate: localDate, badges: string[] }

// stores/usePassiveStore.ts     (편하게 듣기)
{ unlocked: Set<lessonId>, repeatMode: 'one'|'all'|'shuffle' }   // 해금 규칙: §12.3

// stores/useTTSStore.ts (runtime only)
{ voices: SpeechSynthesisVoice[], isSpeaking, currentUtterance }

```

모든 store는 `persist` 미들웨어로 IndexedDB 동기화. TTS 스토어만 메모리 전용. 모든 날짜 값은 로컬 타임존 `YYYY-MM-DD`(§12.5).

---

## 9. TTS 상세 설계

### 9.1 아키텍처: 사전녹음 mp3 우선 + Web Speech 폴백

TTS는 **하이브리드 듀얼 경로**로 동작한다:

- **1차 경로 (recorded)**: 빌드 타임에 사전 합성된 mp3 → `<audio>` 재생. 단말기 음성팩 불필요, 오프라인 안정, 일관된 본토 발음.
- **2차 경로 (device)**: Web Speech API → `SpeechSynthesisUtterance` 재생. 매니페스트에 없는 텍스트의 폴백.
- **음성 모드**: 사용자 설정에서 `'recorded'`(mp3 우선) / `'device'`(단말기 TTS만) 선택.

```
speak(text)
  │
  ├─ voiceMode = 'device' ──────────→ speakSynth(text) → SpeechSynthesisUtterance
  │
  └─ voiceMode = 'recorded' ──→ lookupPrerecorded(text)
        │                         └─ zh-tts-manifest.json에서 검색
        │
        ├─ mp3 HIT ──→ playPrerecorded(url) → <audio> 재생
        │                 │ 실패 시: audio.onerror → 재시도 1회 → fallback
        │
        └─ mp3 MISS ─→ speakSynth(text) → SpeechSynthesisUtterance (온라인 시)
                       └─ 오프라인 strictRecorded → onError('network') 통지
```

### 9.2 구절·문장 2단계 재생 (4가지 모드)

문장은 **통문장 mp3**, 구절은 **개별 mp3**로 각각 합성하며 `zh-tts-manifest.json`에 `{ "我要去图书馆": "27df1ce63cbd.mp3", ... }` 형태로 매핑된다. 구절 mp3를 이어 붙여 문장을 만들지 않는다(운율·성조 변조 훼손 방지). **구절 듣기·끊어 읽기**는 구절 mp3, **문장 듣기·전체 재생·편하게 듣기**는 문장 mp3를 사용한다.

| 모드 | 동작 | 구절 간격 | 용도 |
|---|---|---|---|
| **구절 듣기** 🔹 | 단일 구절 1회 재생 | — | 세밀한 따라하기 |
| **문장 듣기** 🔊 | **문장 통합 mp3** 1회 재생 (통문장 합성 — 3성 변조 등 자연스러운 운율 유지) | — | 문장 전체 흐름 |
| **끊어 읽기** 🐢 | 구절 순차 재생 후 문장 통째 복습 | `chunkGap`(기본 800ms) | 끊어 듣고 따라 말하기 |
| **전체 재생** ▶▶ | `body[]`/`dialog[]` 문장 순차 재생 | `autoplayGap`(기본 1s) | 이어듣기·편하게 듣기 |

**끊어 읽기 플로우** (문장 = 구절 3개):
```
[구절1] →(800ms)→ [구절2] →(800ms)→ [구절3] →(800ms)→ [문장 전체 통째]
```

### 9.3 폴백 매트릭스

| 상태 | 사용자에게 보이는 것 |
|---|---|
| 매니페스트 HIT + mp3 캐시 | <audio> 즉시 재생 (오프라인 OK) |
| 매니페스트 HIT + mp3 미캐시 + 온라인 | 네트워크 fetch → 재생, 실패 시 1회 retry 후 Web Speech 폴백 |
| 매니페스트 MISS + 온라인 | Web Speech로 폴백 |
| 매니페스트 MISS + 오프라인 (recorded 모드) | 'network' 에러 통지 |
| `speechSynthesis` 미지원 + 매니페스트 {} | 🔊 버튼 회색 처리 + 툴팁 |
| zh-CN 보이스 0개 | "중국어 음성 미설치" 카드 + OS 설정 가이드 (device 모드·폴백 필요 시에만 표시, mp3 모드에서는 표시하지 않음) |

### 9.4 취소·에포크 메커니즘

`speakEpoch` 카운터로 모든 비동기 분기를 추적. `stop()` 호출 시 epoch 증가 → 이전 분기 결과를 무시하여 빠른 연속 탭의 race condition 방지.

### 9.5 Chunking 엔진 (구절 분할 + 타임스탬프 매핑)

두 학습 모드가 공통으로 사용하는 **소리 덩어리(Chunk) 인프라**.

- **1차: 콘텐츠 기반 분할** — 마크다운 소스의 `／` 구분자(원어민 검수)를 파서가 `Verse.chunks[]`로 분리. 신뢰도 높은 의미 단위.
- **2차: NLP 기반 분할** — `／` 구분자가 없는 문장은 빌드타임에 경량 규칙/사전(품사·구 경계) 기반으로 보조 분할 (Phase 2 옵션, 필수 아님).
- **타임스탬프 매핑** — 문장은 통문장 mp3로, 구절은 개별 mp3로 합성한 뒤, 문장 mp3 안에서 구절 경계의 `startMs/endMs`를 정합(정렬)하여 `zh-timestamps.json` 생성. 스크립트 화면의 "현재 재생 Chunk 하이라이트"가 이 타임스탬프로 동작.

```
Doc/Markdown/vol*/*.md
      │  (／ 구분자 파싱)
      ▼
lessons-vol*.json  (Verse.chunks[])
      │
      ├── build-tts.ts ──→ 구절별 mp3 + 문장별 mp3
      │                      zh-tts-manifest.json
      └── build-timestamps.ts ──→ 문장 내 구절 경계 정렬
                                   zh-timestamps.json
```

### 9.6 쉐도잉 피드백 (2단계 도입)

**MVP — 녹음 비교 청취**
- `MediaRecorder` 사용. 포맷은 `MediaRecorder.isTypeSupported`로 선택: Chrome/Android = WebM/Opus, **iOS Safari = MP4/AAC**
- 흐름: 원어민 구절 재생 → 사용자 녹음 → "내 소리 재생" → 원어민/내 소리 번갈아 듣기
- 마이크 권한은 **쉐도잉 최초 진입 시** 요청. 거부 시 "듣고 입모양 따라 하기"로 폴백(학습 진행 가능)
- iOS 오디오 세션: 녹음 시작 전 재생 정지, 재생 중 녹음 금지

**Phase 2 — 성조 파형(Pitch Contour) 비교**
- 추출: `Pitchy`(Web Audio 기반)로 F0 시계열 추출, 무성 구간 제외
- 정규화: 화자 간 음높이 차이를 **반음(semitone) 단위 + 화자별 평균 보정**으로 제거, 시간축은 DTW 등으로 정렬
- 표시: 성조 다이어그램(상/중/하) 위에 원어민 곡선(점선) + 사용자 곡선(실선), 구간별 초록(일치)/빨강(불일치)
- **임계값 방침**: 지금 숫자를 정하지 않는다. 실녹음 20~30건으로 튜닝 후 확정하며, **확정 전에는 초록/빨강 판정 없이 두 곡선 겹쳐 보기만 제공**. 옥타브 오류·잡음 대응 필요
- 정량 점수화하지 않음(좌절 방지). 성조 정확도는 **참고용**이며 STT 채점이 아님(§1.4)

### 9.7 백그라운드·화면 잠금 재생 (편하게 듣기)

- **Media Session API**로 잠금 화면 컨트롤·메타데이터 제공
- 백그라운드 재생은 **mp3 `<audio>` 전용**. `speechSynthesis`는 백그라운드에서 동작하지 않으므로 폴백 금지
- 오프라인 재생은 해당 vol mp3가 Cache Storage에 있을 때만 가능(§10.1) → 미캐시 음원은 목록에서 "다운로드 필요" 표시
- **플랫폼 한계 고지**: iOS PWA는 화면 잠금 시 재생이 끊길 수 있음 → 실기기 검증 항목(§18), 안 될 경우 UI에 안내문 표시

---

## 10. PWA · 오프라인 · 캐싱 전략

> **공통 전제**: GitHub Pages subpath 배포이므로 모든 절대 경로는 `/ChinTalk/` 프리픽스. Vite `base: "/ChinTalk/"` 설정 필수.

### 10.1 Service Worker 정책 (Workbox) — 디스크 점유 최소화

**원칙**: install 시점에는 **앱 셸 + `lessons-meta.json` + vol1 JSON**만 precache. mp3는 precache하지 않는다. 나머지는 사용자가 실제 진입·다운로드한 만큼만 캐시.

| 리소스 | 전략 | install 시 precache | 디스크 점유 시점 |
|---|---|---|---|
| HTML, 초기 JS/CSS, 아이콘 SVG | precache | ✅ (≈ 150KB) | 설치 즉시 |
| `lessons-meta.json` (타이틀만, ≈ 15KB) | precache | ✅ | 설치 즉시 |
| `lessons-vol1.json` (≈ 150KB) | precache | ✅ | 설치 즉시 |
| `lessons-vol2~8.json` | CacheFirst (fetch) | ❌ | 각 vol 첫 진입 시 |
| `zh-timestamps.json`, `zh-tts-manifest.json` | CacheFirst | ❌ | 첫 마스터리/데일리 진입 시 |
| `word-dict.json` (단어장 사전, §5.6) | CacheFirst | ❌ | 첫 단어 탭 시 (용량은 실측 후 분할 여부 결정) |
| 마스커블 PNG (≈ 12KB) | precache | ✅ | 설치 즉시 |
| **`/tts/*.mp3`** | CacheFirst + **`RangeRequestsPlugin`** | ❌ | ① 과 진입 시 해당 과 mp3 백그라운드 prefetch ② 설정에서 vol 단위 일괄 다운로드 (`caches.open('tts-vol{n}')` + `addAll`, 진행률 표시) |

**mp3 캐시 정책**
- `<audio>`는 iOS Safari 등에서 **Range 요청**을 사용하므로 `RangeRequestsPlugin` 필수
- 캐시는 vol 단위(`tts-vol1`~`tts-vol8`)로 분리 → 설정에서 vol별 삭제 가능
- mp3는 **자동 만료 없음**(사용자 삭제만), JSON만 `maxEntries: 10`, `maxAgeSeconds: 90일`
- `globPatterns`에서 mp3·vol2~8 JSON 제외(`globIgnores`), vol JSON은 `public/data/`에서 fetch
- 용량은 §5.5 추정(전체 50~80MB, vol당 6~10MB 수준)을 합성 후 실측으로 확정


### 10.2 업데이트 UX
- `registerSW({ onNeedRefresh })` → "새 버전이 있습니다. [지금 업데이트]" 토스트
- 클릭 시 `skipWaiting` + `window.location.reload()`

### 10.3 manifest.webmanifest

```json
{
  "name": "ChinTalk 中国语会话",
  "short_name": "ChinTalk",
  "description": "북경 표준 중국어 회화 학습 PWA",
  "start_url": "/ChinTalk/",
  "scope": "/ChinTalk/",
  "id": "/ChinTalk/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FAFAFA",
  "theme_color": "#7C3AED",
  "lang": "ko",
  "icons": [
    { "src": "/ChinTalk/icons/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" },
    { "src": "/ChinTalk/icons/icon-192.webp", "sizes": "192x192", "type": "image/webp", "purpose": "any" },
    { "src": "/ChinTalk/icons/icon-512.webp", "sizes": "512x512", "type": "image/webp", "purpose": "any" },
    { "src": "/ChinTalk/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 10.4 GitHub Pages 라우팅 주의사항

- **HashRouter 사용** (`/ChinTalk/#/lesson/vol1_01`) → 새로고침 404 없음
- 딥링크 공유 가능 (`https://mykim711231.github.io/ChinTalk/#/lesson/vol2_05`)

---

## 11. (欠番) 검색 설계 — 범위 제외

v1.2에서 검색 기능을 범위에서 제외했다(§0, §6.1). 섹션 번호는 교차 참조 유지를 위해 비워 둔다. 향후 재도입 시 MiniSearch 기반 설계를 새로 작성한다.

---


## 12. 진도·형광펜·스트릭·해금 데이터 모델

### 12.1 IndexedDB 키 구조 (idb-keyval)

| 키 | 값 |
|---|---|
| `settings` | SettingsState |
| `progress` | ProgressState (읽기 완료·스크롤) |
| `favorites` | FavoriteState |
| `highlight` | HighlightState (chunkId → green/yellow/red) |
| `mastery` | MasteryState (단계·자기평가·완료일) |
| `daily` | DailyState (일자별 세션 기록) |
| `streak` | StreakState |
| `passive` | PassiveState (해금 목록) |
| `lastVisit` | localDate |

### 12.2 스트릭 규칙

- 하루 1회 이상 **마스터리 완료 또는 데일리 6단계 종료** 시 그날 완료
- 전날 완료 → `streakDays + 1`, 같은 날 중복 완료 → 변동 없음, 하루 건너뜀 → **주 1회 쉬는 날**(아래) 적용, 이틀 이상 건너뜀 → 1로 리셋
- **쉬는 날(유예)**: 월~일 한 주(로컬 기준)에 1회, 하루를 건너뛰어도 스트릭 유지. 사용 시 "쉬어가는 날로 기록했어요" 안내. 구현: `streak.freezeUsedWeek`(ISO 주 키)만 추가하고 `lastDoneDate` 간격이 2일이며 해당 주 미사용이면 유지
- 끊김 시 비난·압박 문구 금지(심리 허들 원칙)

### 12.3 해금 규칙

```ts
// 과 L이 해금되는 조건 (둘 중 하나)
const unlocked =
  mastery.selfRating[L] !== undefined   // Final Check 제출
  || daily.log.some(d => d.lessonId === L && d.done);  // 데일리 6단계 종료
```
- 해금은 **한 번 되면 유지**(콘텐츠 해시가 바뀌어도 `lessonId` 기준)
- `usePassiveStore.unlocked`는 위 조건 충족 시 갱신. 플레이리스트는 `passiveTags`로 자동 구성

### 12.4 데일리 음원 추천 규칙

1. 진행 중인(마스터리 1~3단계) 가장 최근 과
2. 없으면 `level` 내 다음 미완료 과(학습 경로 순서)
3. 첫 사용이면 온보딩에서 고른 레벨의 첫 과
- 시작 전 목록에서 다른 과로 변경 가능

### 12.5 날짜 유틸

```ts
// UTC(toISOString) 사용 금지 — 한국 새벽 시간에 하루가 어긋남
function toLocalDateKey(d = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

---


## 13. 폴더 구조 & Vite 설정

### 13.1 폴더 트리

```
ChinTalk/   (= GitHub repo mykim711231/ChinTalk)
├── Doc/
│   ├── _design.md                   ← 본 문서
│   ├── Dictionary/                  ← 공통 단어장 (다의어 사전, 전역 단일 소스)
│   │   └── dict-a.md ~ dict-z.md   ← 병음 초성별 단어 사전
│   └── Markdown/                    ← 원본 콘텐츠 (수정 금지 영역)
│       ├── vol1/                    ← 기초 일상 (20과, *.md)
│       ├── vol2/                    ← 생활 회화 (20과)
│       ├── vol3/                    ← 여행 회화 (20과)
│       ├── vol4/                    ← 비즈니스 회화 (20과)
│       ├── vol5/                    ← 고급·실무 회화 (20과)
│       ├── vol6/                    ← 네이티브 표현 (20과)
│       ├── vol7/                    ← 의사소통 기능 (20과)
│       └── vol8/                    ← 시사·논증 (20과)
├── app/
│   ├── package.json
│   ├── vite.config.ts              ← base: "/ChinTalk/"
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── index.html
│   ├── public/
│   │   ├── icons/
│   │   ├── tts/                    ← TTS mp3 정적 에셋 (SHA-1 파일명)
│   │   └── manifest.webmanifest
│   ├── scripts/
│   │   ├── build-content.ts        ← Doc/Markdown/*.md → vol별 JSON
│   │   ├── build-timestamps.ts   ← 구절 타임스탬프 정합
│   │   ├── build-tts.ts            ← zh 텍스트 → mp3 합성
│   │   ├── verify-tts-coverage.ts  ← mp3 누락 검증 게이트
│   │   ├── tts-texts.ts            ← TTS 텍스트 수집·해시 (공유 모듈)
│   │   └── generate-icons.ts       ← SVG → WebP/PNG 자동 생성
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── types/lesson.ts
│       ├── data/                   ← 빌드 산출물 (gitignore)
│       │   ├── lessons-vol1.json ~ lessons-vol8.json
│       │   ├── lessons-meta.json
│       │   ├── zh-timestamps.json
│       │   └── zh-tts-manifest.json
│       ├── stores/
│       │   ├── useSettingsStore.ts
│       │   ├── useProgressStore.ts
│       │   ├── useFavoriteStore.ts
│       │   ├── useHighlightStore.ts
│       │   ├── useMasteryStore.ts
│       │   ├── useDailyStore.ts
│       │   ├── useStreakStore.ts
│       │   ├── usePassiveStore.ts
│       │   └── useTTSStore.ts
│       ├── lib/
│       │   ├── tts.ts
│       │   ├── date.ts              ← toLocalDateKey
│       │   ├── unlock.ts            ← 해금 규칙
│       │   ├── dailyPicker.ts       ← 데일리 음원 추천
│       │   ├── recorder.ts          ← MediaRecorder 래퍼
│       │   ├── ttsCache.ts          ← vol별 mp3 다운로드·삭제
│       │   ├── db.ts
│       │   └── contentLoader.ts
│       ├── components/
│       │   ├── BottomNav.tsx
│       │   ├── Footer.tsx
│       │   ├── ChunkCard.tsx        ← 말뭉치 카드
│       │   ├── TTSButton.tsx
│       │   ├── WordCard.tsx
│       │   ├── RelatedVocabTable.tsx
│       │   ├── ProgressRing.tsx
│       │   ├── StreakBadge.tsx
│       │   ├── BlurSubtitle.tsx     ← Blind 자막 블러
│       │   ├── WordSheet.tsx        ← 단어장 바텀시트 (§5.6)
│       │   ├── HighlightPicker.tsx  ← 3색 형광펜
│       │   ├── TrapPopup.tsx        ← 발음 함정 💡
│       │   ├── RecorderPanel.tsx    ← 쉐도잉 녹음·비교 청취
│       │   ├── DailyTimer.tsx
│       │   └── InstallPrompt.tsx
│       ├── pages/
│       │   ├── HomePage.tsx
│       │   ├── OnboardingPage.tsx
│       │   ├── PathPage.tsx
│       │   ├── LessonPage.tsx      ← lazy
│       │   ├── MasteryPage.tsx      ← lazy
│       │   ├── DailyPage.tsx        ← lazy
│       │   ├── PassivePage.tsx      ← lazy
│       │   ├── SettingsPage.tsx
│       │   └── AboutPage.tsx
│       ├── hooks/
│       │   ├── useTTS.ts
│       │   ├── useInstallPrompt.ts
│       │   ├── useScrollProgress.ts
│       │   ├── useTimer.ts
│       │   ├── useRecorder.ts
│       │   └── useMediaSession.ts
│       └── styles/tokens.css
├── .gitignore                      ← app/src/data/*.json 무시
└── .github/
    └── workflows/
        └── deploy.yml              ← GitHub Pages 자동 배포
```

### 13.2 Vite 설정 핵심

```ts
// app/vite.config.ts
export default defineConfig({
  base: '/ChinTalk/',                      // ★ GitHub Pages subpath
  plugins: [
    react(),
    viteCompression({ algorithm: 'gzip', threshold: 1024 }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg', 'icons/*.webp'],
      manifest: false,
      workbox: {
        navigateFallback: '/ChinTalk/index.html',
        globPatterns: ['**/*.{js,css,html,svg,webp}', 'data/lessons-meta.json', 'data/lessons-vol1.json'],
        globIgnores: ['**/tts/**', '**/lessons-vol[2-8].json'],   // mp3·vol2~8 JSON은 precache 제외 (§10.1)
        runtimeCaching: [/* §10.1 표 참조 */],
      },
    }),
  ],
  build: {
    target: 'es2017',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand', 'idb-keyval'],
        },
      },
    },
  },
});
```

---

## 14. 접근성 (a11y)

- 모든 인터랙티브 요소 최소 44×44px 터치 타깃
- `aria-label`: 🔊 버튼은 "중국어 발음 듣기"
- 키보드 내비게이션: Tab / Enter / Space 모두 지원
- 색상 대비 WCAG AA 이상 (4.5:1)
- `prefers-reduced-motion` 존중
- 스크린 리더용 페이지 타이틀 동적 업데이트 (`<title>`)
- 큰글씨 모드는 글로벌 CSS 변수 → 모든 UI 일관 확대

---

## 15. 호환성 매트릭스

| 환경 | 최소 버전 | 핵심 기능 동작 | 비고 |
|---|---|---|---|
| Android Chrome | 60+ | 전체 동작 | PWA 설치, TTS, IndexedDB |
| Samsung Internet | 7+ | 전체 동작 | PWA 설치 가능 |
| iOS Safari | 12+ | 부분 | TTS unlock 필요, 설치 가이드 모달 |
| iOS Safari | 16.4+ | 전체 | 백그라운드 오디오 제약 실기기 검증 필요 (§9.7) |
| iOS Safari | 14.1+ | 쉐도잉 녹음 | MediaRecorder(MP4/AAC), 권한은 사용 시점 요청 (실기기 검증 필요) |
| Desktop Chrome/Edge | 80+ | 전체 동작 | |
| Desktop Firefox | 78+ | 전체 동작 | TTS 보이스 OS 의존 |
| Desktop Safari | 14+ | 전체 동작 | |

**Polyfill**: `core-js` 부분 적용, target `es2017`.

---

## 16. 성능 목표 (SLO)

| 지표 | 목표 (모바일 3G) |
|---|---|
| TTI (Time to Interactive) | < 3.5s |
| LCP | < 2.5s |
| 초기 JS gzip | < 100 KB (상한 150 KB) |
| 콘텐츠 JSON gzip | < 600 KB |
| mp3 총 용량 | 추정 50~80 MB (vol1 실측 6.77MB/576개 → 전체 약 55MB 예상, 나머지 권은 합성 후 확정) |
| Lighthouse PWA score | ≥ 95 |
| Lighthouse Performance | ≥ 85 |

---

## 17. CI/CD

### 17.1 GitHub Actions (`.github/workflows/deploy.yml`)

```yaml
name: Deploy PWA to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: app/package-lock.json }
      - run: npm ci
        working-directory: app
      - run: npm run build:content       # Doc/Markdown/*.md → JSON chunks
        working-directory: app
      - run: npm run build:timestamps    # 구절 타임스탬프 정합
        working-directory: app
      - run: npm run verify:tts          # TTS mp3 커버리지 검증 (누락 시 실패)
        working-directory: app
      - run: npm run build               # vite build → app/dist
        working-directory: app
      - uses: actions/upload-pages-artifact@v3
        with: { path: app/dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Repo 설정**: Settings → Pages → Source: **GitHub Actions**.
**최종 URL**: `https://mykim711231.github.io/ChinTalk/`

### 17.2 콘텐츠 수정 워크플로
- `Doc/Markdown/*.md` 수정 → push → CI 자동 트리거 → 약 2~3분 후 배포 완료
- 사용자 재진입 시 SW가 새 빌드 감지 → 업데이트 토스트 표시
- 코드 변경 없이 콘텐츠만 수정해도 정상 작동

---

## 18. 테스트 전략

| 항목 | 도구 | 비고 |
|---|---|---|
| 타입 체크 | `tsc --noEmit` | CI 필수 |
| 유닛 테스트 | Vitest | 핵심 유틸 (로컬 날짜·스트릭, 해금 규칙, 데일리 음원 추천, TTS epoch) |
| 콘텐츠 검증 | verify:tts + 커스텀 스크립트 | mp3 누락·섹션 순서·3줄 패턴 검사 |
| E2E 스모크 | 수동 | 주요 화면 + PWA 설치 + 오프라인 + **iOS 백그라운드 재생·녹음 실기기** |
| 접근성 | 수동 | 큰글씨 + 다크모드 + 스크린리더 |

---

## 19. 화면별 수용 기준 (Acceptance Criteria)

### S-001 홈
- [ ] 스트릭 배지, 오늘의 한 마디(날짜 기준 고정)
- [ ] 오늘의 10분 데일리 CTA (추천 과 표시)
- [ ] 이어 학습하기(마스터리 진행 단계)
- [ ] 이해도 달성률(🟢/🟡/🔴 비율) 표시
- [ ] 레벨 타일 4개, 편하게 듣기 진입(해금 곡 수)
- [ ] 하단 탭바 5개(홈/경로/데일리/듣기/설정) 정상 동작

### S-002 온보딩
- [ ] 3슬라이드(원리 / 레벨 선택(Lv.1~4) / 마이크 안내), 건너뛰기 가능
- [ ] 마이크 권한은 쉐도잉 최초 진입 시 요청(온보딩에서 요청하지 않음)
- [ ] 완료 후 설치 안내 모달 표시, 설정에서 다시 보기 가능

### S-003 학습 경로
- [ ] Lv.1~4 탭 전환 (각 40과)
- [ ] 과 행: 번호·제목·마스터리 단계·형광펜 달성률·⭐·🎧
- [ ] 진도 도넛 (레벨별 % + 전체 %)

### S-004 과 참고
- [ ] 본문 말뭉치 카드 스택(한자/병음/한글), 표시 모드 토글
- [ ] 🔊 단일·길게 누름(한국어) 재생, ▶▶ 전체 연속 재생
- [ ] 섹션 탭 5개(본문/단어/관련단어/어법/회화)
- [ ] 단어 탭 → 단어장 바텀시트(다의어 번호, 과 내 뜻 하이라이트), 사전에 없으면 병음만 표시
- [ ] 즐겨찾기 토글, 마스터리 시작 버튼
- [ ] 이전/다음 과 이동 + 좌우 스와이프, 70% 스크롤 시 읽기 완료 표시

### S-005 마스터리
- [ ] 4단계 진행·이전/다음 단계, 단계 저장·복원
- [ ] Blind 자막 블러 + 키워드 칩, Script Chunk 하이라이트(타임스탬프 연동)
- [ ] 발음 함정 💡 팝업, 3색 형광펜 마킹·달성률 갱신
- [ ] Shadowing: 녹음 → 내 소리 재생 → 원어민과 비교 청취 (마이크 거부 시 폴백)
- [ ] Final Check 5점 자기평가 제출 → 마스터리 완료·해금·스트릭 갱신

### S-006 10분 데일리
- [ ] 음원 자동 추천 + 변경, 6단계 타이머(1+1+2+2+2+2분) 자동 전환
- [ ] 일시정지·건너뛰기, 단계 전환 토스트
- [ ] 🔴북마크가 형광펜 red와 동일 데이터로 저장
- [ ] 6단계 종료 시 해금·스트릭 갱신

### S-007 편하게 듣기
- [ ] 해금된 과만 목록 노출, `passiveTags` 플레이리스트
- [ ] 반복(단일/전체/랜덤), Media Session 잠금 화면 컨트롤
- [ ] 미다운로드 vol은 "다운로드 필요" 표시, 오프라인 재생 동작

### S-008 설정
- [ ] 글자 크기 4단계(0.9/1.0/1.2/1.4) / 다크모드 / 표시모드
- [ ] 음성 모드·TTS 속도·구절/연속 재생 간격
- [ ] vol별 mp3 다운로드·삭제·용량 표시, 캐시 정리·전체 초기화

### S-009 정보
- [ ] 버전·빌드 정보, 콘텐츠 출처 안내문, 오픈소스·개인정보 안내
- [ ] Footer 저작권 전역 적용

### S-010 설치 안내
- [ ] iOS 가이드 / Android 네이티브 설치, "다시 보지 않기" 7일 후 재표시
- [ ] 온보딩 완료 이후에만 표시

---

## 20. 변경 이력 및 미결 사항

### 20.1 v1.2.1 (2026-11-05) — 미결 항목 결정 반영
- 데일리 "표현 확인"만 단어장 비활성, Script·과 참고는 활성 (§2.2, §6.6, §6.7)
- 발음 함정 2계층(공통 DB + 과별 고유) 및 출시 게이트 (§5.1)
- 성조 파형 임계값: 튜닝 전 겹쳐 보기만 (§9.6)
- 스트릭 주 1회 쉬는 날 도입 (§12.2)
- mp3 용량 실측 절차 (§5.5), 단어장 사전 출처·라이선스 표기 (§1.5, §6.10)
- §20.2 결정 완료 표, §20.3 남은 확인 사항으로 재편

### 20.1.1 v1.2 (2026-11-05) — v1.1 검토 반영
- 화면 ID를 S-001~S-010으로 통일 (§6, §13, §19)
- 검색·플래시카드(SRS) 범위 제외 확정, 관련 설계 전부 제거 (§11은 欠番)
- 문장은 통합 mp3, 구절은 별도 mp3 (§5.5, §9.2)
- mp3 캐싱 정책(Range, vol 캐시, prefetch) 추가 (§10.1), vol JSON precache 오류 수정
- 성조 파형 비교를 Phase 2로 분리, MVP는 비교 청취 (§9.6)
- 해금·데일리 음원·스트릭·날짜 규칙 확정 (§12), 백그라운드 재생 한계 명시 (§9.7)
- 폰트 스케일·초기 JS 목표 불일치 정리, vol→level 매핑·안정 chunk ID 정의

### 20.2 결정 완료 (v1.2.1)

| # | 항목 | 결정 |
|---|---|---|
| 1 | 단어장 vs 데일리 "사전 검색 금지" | 데일리 "표현 확인" 단계만 단어장 비활성(🔴마킹만), Script 단계·과 참고는 활성 (§6.6·§6.7) |
| 2 | 발음 함정 작성 | 공통 함정 DB(약 30개) + 과별 고유는 vol1~2부터 단계적. 출시 게이트=공통 DB + vol1 검수 (§5.1) |
| 3 | 성조 파형 임계값 | 지금 미정. 실녹음 20~30건 튜닝 후 확정, 확정 전엔 겹쳐 보기만 (§9.6) |
| 4 | 스트릭 유예 | 도입 — 주 1회 쉬는 날 (§12.2) |
| 5 | mp3 실측 용량 | vol1 먼저 합성·실측 후 환산, 한도 근접 시 분리 (§5.5) |
| 6 | 단어장 사전 저작권 | `word-dict.json`만 CC BY-SA 4.0(앱 코드 MIT·과 콘텐츠와 분리), About에 출처·수정 표기, "직접 창작·All Rights Reserved" 문구 삭제 → "AI 보조 제작 + 직접 검수·편집"으로 사실대로 표기 (§1.5) |

### 20.3 남은 확인 사항
1. **라이선스 원문 직접 확인**(법률 검토는 불필요): CC-CEDICT 최신 파일 헤더의 라이선스 버전, DeepSeek 사용 경로(웹/API)의 약관, 사용 TTS 서비스의 mp3 저장·재배포 조건. 저장소에 `LICENSE`(MIT)와 `LICENSE-CONTENT.md`(사전 BY-SA 구분) 작성
2. 성조 파형 실녹음 튜닝 (Phase 2 착수 시)
3. **TTS 약관 리스크 인지**: edge-tts는 비공식이라 합성 음원 재배포가 명시적으로 허용되지 않음 → 무료 공개 한정으로 감수, 수익화·배포 확대 시 Azure AI Speech로 재합성
4. iOS PWA 백그라운드 재생·녹음 실기기 검증
5. 공통 함정 DB 약 30개 항목 선정·원어민 검수
- v1.3: 4단계 마스터리를 **심화 학습**으로 개편(듣고 이해 퀴즈 → 한글 보고 떠올리기 → 간체 보고 떠올리기 → 따라 말하기), 점수 50/50·80점 마스터, 못한 문장 1·3·7일 복습(`/review`) 추가 — 기존 "SRS 범위 제외"는 이 범위만 번복
