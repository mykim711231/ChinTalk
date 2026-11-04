# ChinTalk — 중국어 구조화 듣기 학습 PWA 설계서

> **문서 버전**: v1.1
> **작성일**: 2026-11-05
> **상태**: 콘텐츠 작성 완료 (8권 × 20과 = 160과) + 구조화 듣기 학습 모드(PRD) 반영, 구현 대기

---

## 0. 결정사항 요약 (Decisions)

| 항목 | 결정 |
|---|---|
| 접근 제어 | **완전 공개** — URL만 알면 접근, 로그인 없음 |
| MVP 범위 | (1) 160과 회화 (8권 × 20과) + 말뭉치 분할 발음(TTS) · (2) 한자·병음·한글 토글 + 진도 · (3) 통합 검색 · (4) 플래시카드 Leitner SRS — **4개 모두 포함** |
| 디자인 톤 | **모던 회화 학습앱** (밝은 배경 + 포인트 컬러, 카드형 UI) + **큰글씨 토글 옵션** |
| 배포 | **GitHub Pages** (`https://mykim711231.github.io/ChinTalk/`), 앱스토어 미사용 |
| 음성 | 디바이스 내장 Web Speech API (TTS) 또는 오픈소스 TTS 사전 합성 mp3 (구절 단위) |
| 말뭉치 읽기 | **문장 + 구절 2단계** — 긴 문장은 `／` 구분자로 호흡 단위 분할, 4가지 재생 모드(구절/문장/끊어읽기/전체) |
| 핵심 학습 철학 | **소리→의미 직결 · Chunk 리듬 체화 · 심리 허들 낮추기** (한국인 3대 고통: 한글 해독 의존·성조 무너짐·3일 포기 해소) |
| 학습 모드 | **모드1: 4단계 심화 마스터리** (Blind→Script→Shadowing→Final Check, 사용자 주도) + **모드2: 10분 데일리 루틴** (타이머 기반, 시스템 주도) |
| 레벨 명칭 | HSK 급수 대신 **한국인 공감형**: Lv.1 왕초보 귀 트이기 / Lv.2 중국어 벽 뚫기 / Lv.3 네이티브 리듬 정복 / Lv.4 프리토킹 마스터 |
| 발음 함정 | **한국인 발음 함정 경고** — q는 '츄'가 아님, 和는 '훠' 등 특정 Chunk 탭 시 💡팝업 |
| 쉐도잉 피드백 | 녹음 시 원어민·사용자 **성조 파형(Pitch Contour) 비교** (초록=일치/빨강=불일치) |
| 3색 형광펜 | 사용자 직접 마킹 (🟢바로 이해/🟡헷갈림/🔴완전 생소) → 성취감 시각화 |
| 편하게 듣기 | 모드1·2 **완료한 음원만 해금** — 🎧출근길/설거지/자장가용 큐레이션, 백그라운드 재생 |
| 게이미피케이션 | 3색 형광펜 달성률 · 연속 학습 배지(스트릭) · 레벨 정복 뱃지 |
| 분석 도구 | **미설치** (사용자 추적 없음) |
| 알림 | 웹 푸시 미사용 |
| 앱 아이콘 | 텍스트 마크 "Chin·Talk" SVG |
| 용량 정책 | **단말기 디스크 점유 최소화** — 앱 셸 + vol1만 precache, 나머지 lazy, 사용자 캐시 정리 가능 |
| 저작권 | **모든 회화·예문 직접 창작** — Footer 저작권 표기 + About 페이지 안내문 의무 |
| 콘텐츠 주제 | **북경 표준어(普通话) 일상·비즈니스 회화** (신앙·종교 콘텐츠 없음) |

---

## 1. 프로젝트 개요

### 1.1 목적
북경 표준어(普通话)의 일상·여행·비즈니스 회화를 **"구조화된 듣기" 방식**으로 학습할 수 있는 PWA를 제작한다. 문장을 **소리 덩어리(Chunk) 단위로 끊어** 한자·병음·한글 번역과 함께 듣고, 쉐도잉·성조 피드백으로 체화하도록 하며, 앱스토어 없이 URL 한 줄로 배포한다. 오프라인·음성·검색·복습(플래시카드)을 모두 지원한다.

### 1.0 핵심 학습 철학 (한국인 3대 고통 해소)

한국인 중국어 학습자가 흔히 겪는 세 가지 고통을 설계의 중심축으로 삼는다:

| 고통 | 원인 | 해결 원칙 |
|---|---|---|
| **한글 해독 의존** | 눈으로 한자를 보고 한글로 번역한 뒤에야 이해 | **"소리(Sound) → 의미(Meaning)" 직결** — Blind 듣기 → 스크립트 확인 순서로 소리 우선 신경 회로 형성 |
| **성조 무너짐** | 긴 문장을 통째로 듣고 따라 해 성조 리듬 상실 | **Chunk(소리 덩어리) 단위 리듬 체화** — 호흡 단위로 끊어 성조·리듬을 몸에 새김 |
| **3일 만에 포기** | "공부"라는 심리적 부담과 막연한 목표 | **명확한 가이드 + 성취감** — 게임 같은 4단계·10분 루틴, 3색 형광펜·배지로 진척 시각화 |

### 1.2 핵심 가치 제안
- **듣고 이해한다** — Blind(자막 블러)로 시작해 소리→의미 직결 (오프라인 지원)
- **끊어서 체화한다** — Chunk 단위 재생·쉐도잉·성조 파형 비교
- **부담 없이 매일** — 10분 데일리 루틴, 편하게 듣기(백그라운드)
- **보이는 성취** — 3색 형광펜 달성률, 연속 학습 배지
- **꾸준히 복습** — 플래시카드 Leitner SRS

### 1.3 비목표 (Out of Scope, Phase 1)
- 사용자 계정 / 클라우드 동기화
- 채점·시험·스피킹 인식(STT 평가) 기능
- 멀티 디바이스 진도 공유
- 동영상 강의
- 웹 푸시 알림
- 사용자 분석/추적 (개인정보 부담 0, 로그 없음)

### 1.4 저작권 & 안내문 (필수)

**Footer (모든 화면 하단):**
```
© ChinTalk. All content is self-created. All Rights Reserved.
```

**About 페이지 (설정 → 정보):**
> ### 콘텐츠 출처 및 이용 안내
> 본 애플리케이션에서 제공하는 모든 중국어 회화·어휘·병음·문법
> 설명은 표준 중국어(普通话)의 공개 어휘·문법 체계를 기반으로
> 자체 편집·창작되었습니다.
> 모든 대화문과 예문은 직접 창작되었으며,
> 무단 복제 및 상업적 이용을 금합니다.

---

## 2. 사용자 페르소나 & 시나리오

### 2.1 페르소나

| 페르소나 | 특징 | 주요 사용 맥락 |
|---|---|---|
| **P1 김직장인 (30대 남)** | 출퇴근 지하철, 중국 출장 준비, 짧은 틈새 시간 | 비즈니스 회화(vol4·5), 빠른 이어듣기, 플래시카드 |
| **P2 이대학생 (20대 여)** | 중국어 회화 초·중급, 교환학생 준비, 데스크톱+모바일 | 기초·생활 회화(vol1·2), 문법 포인트, 관련 단어 모음 |
| **P3 박여행가 (40대 남)** | 중국 자유여행 준비, 시력 약화, Android 폰 | 여행 회화(vol3), 큰글씨 모드, 천천히 듣기 |
| **P4 최은퇴자 (60대 여)** | 취미로 중국어 시작, 한글 번역 의존 | 기초 회화(vol1), 한글 뜻 위주, 말뭉치 천천히 듣기 |

### 2.2 핵심 시나리오 (User Journey)
1. 사용자가 공유 링크로 URL 열기 → 브라우저에서 PWA 접속
2. 첫 진입 시 "홈화면에 추가" 가이드 → 설치
3. 홈 → "이어 학습하기" 또는 권(Vol) 선택
4. 과 진입 → 본문 카드 → 🔊 탭으로 문장(말뭉치) 단위 듣기
5. 관련 단어 모음·문법 포인트로 확장 학습
6. 모르는 표현은 플래시카드 → Leitner SRS로 복습
7. 다음날 자발적 재진입 → 진도 자동 복원

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
| 검색 | MiniSearch | ^7.0 | 한자·병음·한글 토크나이저 커스텀 |
| 마크다운 파서 | unified + remark-parse | latest | .md → JSON 변환 (빌드 타임) |
| 폰트 | **시스템 폰트만** (웹폰트 미사용) | — | 용량 0KB, 한자 폴백 체인 |
| 테스트 | Vitest + Testing Library | ^2.0 | Vite 네이티브 통합 |
| 배포 | **GitHub Pages** | — | 무료 HTTPS, base path `/ChinTalk/` |
| CI | GitHub Actions (`actions/deploy-pages@v4`) | — | main push 시 자동 빌드·배포 |

**번들 목표**: 초기 JS gzip < **100KB**, 콘텐츠 vol별 chunk, 첫 LCP < 2.5s (3G)

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
│  │   ├── build-search-index.ts ← MiniSearch 사전 빌드       │
│  │   ├── build-tts.ts          ← zh 텍스트 → mp3 합성       │
│  │   └── verify-tts-coverage.ts← mp3 누락 검증 게이트       │
│  └── app/src/                  ← React PWA                  │
└─────────────────────────────────────────────────────────────┘
                       │ git push
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions (CI)                                        │
│  1. Doc/Markdown/*.md → app/src/data/lessons-vol*.json      │
│  2. MiniSearch 사전 인덱스 빌드                             │
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
│  ├── IndexedDB                ← 진도·즐겨찾기·SRS 상태      │
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
- `traps` — 한국인 발음 함정 항목 (원어민 검수 후 수동 등록)

### 5.2 마크다운 → JSON 변환

`scripts/build-content.ts`가 `Doc/Markdown/vol*/*.md`를 읽어 다음 구조로 변환:

```ts
// app/src/types/lesson.ts
export type Chunk = {
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
- `app/src/data/search-index.json` (MiniSearch 사전 빌드)
- `app/src/data/zh-tokens.json` (모든 zh 텍스트의 토큰 분할 매니페스트)
- `app/src/data/zh-tts-manifest.json` (zh 텍스트 → mp3 파일명 해시 매핑)
- `app/src/data/word-dict.json` (단어 사전 — 탭하여 단어장 팝업용, §5.6 참조)
- `app/public/tts/*.mp3` (TTS 정적 에셋, SHA-1 해시 파일명)

### 5.5 TTS 음성 에셋 파이프라인

학습 콘텐츠의 모든 zh 텍스트(말뭉치 청크 단위)는 **빌드 타임에 mp3로 사전 합성**되어 정적 에셋으로 커밋된다. 런타임 Web Speech API가 아닌 정적 mp3 재생을 기본으로 하여 오프라인·일관된 발음 품질을 보장한다.

**스크립트**:
- `build-tts.ts` — `lessons-vol*.json`에서 모든 zh 텍스트 수집 → `msedge-tts`로 mp3 합성 → `public/tts/{sha1}.mp3` 저장 → `zh-tts-manifest.json` 갱신
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
- 콘텐츠 추가 시 `npm run build:tts -- --phase all` 로 mp3 합성 후 함께 커밋
- `npm run build:all` = `build:content && build:search && verify:tts` (verify 실패 시 빌드 중단)

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
3. `Doc/Dictionary/` 공통 사전에서 각 단어의 **다의어(多义) 뜻풀이**를 조회해 매핑 → `word-dict.json` (공개 도메인 사전 기반 자체 편집, 저작권 주의)

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

> **다의어 데이터 소스**: 과별 `主要词汇`(과 맥락의 단일 뜻)·`相关词汇`은 "이 과에서 쓰인 뜻"만 담는다. 반면 **단어장 사전(`word-dict.json`)은 별도로 다의어 뜻풀이를 갖춘 사전 데이터**를 사용한다(공개 도메인 사전 기반 자체 편집, 저작권 주의). 단어 탭 시 이 사전에서 모든 뜻을 번호로 표시하고, 과에서 쓰인 뜻은 하이라이트한다.

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

| ID | 화면명 | 우선순위 | 경로 | 핵심 |
|---|---|---|---|---|
| S-001 | 홈 (Home) | P0 | `/` | 모드 선택 + 오늘의 한 마디 + 스트릭 |
| S-002 | 온보딩 (Onboarding) | P0 | `/onboarding` | 소리→의미 안내 · 레벨 선택 · 마이크 권한 (신규) |
| S-003 | 학습 경로 (Learning Path) | P0 | `/path` | Lv.1~4 레벨별 과 목록 (기존 목차 재정의) |
| S-004 | 과 참고 (Script Reference) | P0 | `/lesson/:id` | 스크립트 Chunk 하이라이트 + 단어·문법·발음함정 (기존 과 상세) |
| S-005 | 4단계 마스터리 (Deep Mastery) | P0 | `/lesson/:id/mastery` | Mode 1 · Blind→Script→Shadowing→Final |
| S-006 | 10분 데일리 (Daily Routine) | P0 | `/daily` | Mode 2 · 타이머 6단계 |
| S-007 | 편하게 듣기 (Passive Listening) | P1 | `/passive` | 해금 음원 백그라운드 재생 |
| S-008 | 단어장 (Dictionary) | P1 | `/dictionary` | 공통 사전 탐색·검색 (Doc/Dictionary 기반) |
| S-009 | 내 단어장 (My Words) | P0 | `/my-words` | 3색 형광펜·즐겨찾기 마킹 단어 복습 |
| S-010 | 설정 (Settings) | P0 | `/settings` | |
| S-011 | 정보 (About) | P0 | `/about` | |
| S-012 | 설치 안내 모달 (Install Prompt) | P0 | overlay | |

> **삭제**: 검색(Search)·플래시카드(Flashcards) — 듣기 중심 앱에서 비핵심. 복습은 🔴북마크(3색 형광펜) + 편하게 듣기로 대체.
> **신규**: 온보딩 — 첫 진입 시 "소리→의미" 학습 원리 안내, Lv.1~4 레벨 선택, 마이크 권한 획득(쉐도잉용). 심리 허들을 낮추는 핵심 진입점.

### 6.2 S-001 홈

```
┌──────────────────────────────────┐
│  ☰  ChinTalk 中国语会话       ⚙  │  ← 상단바
├──────────────────────────────────┤
│  ╭────────────────────────╮      │
│  │ 오늘의 한 마디          │      │  ← 매일 다른 문장
│  │ 你好！                 │      │
│  │ Nǐ hǎo!               │      │
│  │ 안녕하세요!            │ 🔊  │
│  ╰────────────────────────╯      │
│                                  │
│  ▶  이어 학습하기                │  ← 마지막 학습 과
│  Vol.1 · 02과 · 自我介绍          │
│  ████████░░ 80%                 │
│                                  │
│  📚 권 선택                      │
│  [Vol.1] [Vol.2] [Vol.3]         │
│  [Vol.4] [Vol.5]                 │
│                                  │
│  🃏 오늘의 복습 (12장)            │  ← SRS due cards
│                                  │
│  [홈] [목차] [검색] [복습] [설정]│  ← 하단 탭바
└──────────────────────────────────┘
```

**컴포넌트**: `<SentenceOfDay>`, `<ContinueCard>`, `<VolumeTiles>`, `<SrsTodayCard>`, `<BottomNav>`

### 6.3 S-002 목차

- 상단 탭: Vol.1 (20) / Vol.2 (20) / Vol.3 (20) / Vol.4 (20) / Vol.5 (20)
- 각 과 행: `01. 问候 · 인사   ✓ ⭐`
  - ✓ 완료 / ⭐ 즐겨찾기
- 우측 진도 도넛 (vol별 % + 전체 %)
- 검색 바 (간단 텍스트 필터)

### 6.4 S-003 과 상세 (핵심 화면)

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
- 단어/관련단어 섹션에서 "📥 카드에 추가" → SRS Leitner Box1 투입
- 스크롤이 70% 이상 도달 시 자동 "완료" 표시
- 좌우 스와이프로 이전/다음 과 이동

**섹션 탭**:
- **본문**: `body[]` 말뭉치 카드 스택
- **단어**: `vocab[]` 6개 (한자 풀이·예문 포함)
- **관련단어**: `relatedVocab[]` 그룹별 표 렌더, 행 탭 시 발음
- **어법**: `grammar[]` 패턴 + 예문
- **회화**: `dialog[]` A/B 말풍선 스타일

### 6.5 S-004 검색

- 상단 검색바 (실시간 디바운스 200ms)
- 필터 칩: [한자] [병음] [한글] [본문] [단어]
- 결과 리스트: 매칭 문맥 ±20자 하이라이트
- 결과 탭 시 해당 과의 해당 말뭉치로 스크롤 점프

### 6.6 S-005 플래시카드 (SRS)

**알고리즘**: Leitner 5박스 (단순화된 SRS, 오프라인 친화)

| 박스 | 다음 복습 간격 |
|---|---|
| 1 | 1일 |
| 2 | 3일 |
| 3 | 7일 |
| 4 | 14일 |
| 5 | 30일 (마스터) |

**규칙**:
- 정답(쉬움) → 다음 박스
- 오답(어려움) → Box 1으로 강등
- Box 5에서 정답 → "마스터" 처리 (큐 제외)

**카드 UI**:
```
┌──────────────────────────────────┐
│ 오늘 복습: 12 / 30               │
│ Box 2 · 7일 후 재출제            │
├──────────────────────────────────┤
│                                  │
│        你 好                    │  ← 앞면: 한자만
│                                  │
│         🔊                       │
│                                  │
│      [뜻 보기]                  │
└──────────────────────────────────┘

  뒤집은 후:
┌──────────────────────────────────┐
│        你 好                    │
│       Nǐ hǎo                    │
│       안녕하세요                │
│                                  │
│  [😖 어려움] [😐 보통] [😊 쉬움]│
└──────────────────────────────────┘
```

### 6.7 S-006 설정

| 설정 | 옵션 | 기본값 |
|---|---|---|
| 글자 크기 | 작게(90%) / 보통(100%) / 크게(120%) / 매우 크게(140%) | 보통 |
| 다크 모드 | 시스템 / 라이트 / 다크 | 시스템 |
| 표시 모드 기본값 | 전체 / 한자+병음 / 한자만 | 전체 |
| TTS 음성 (zh-CN) | 사용 가능 보이스 목록 | OS 기본 |
| TTS 음성 (ko-KR) | 사용 가능 보이스 목록 | OS 기본 |
| TTS 속도 | 0.5× ~ 1.5× (슬라이더) | 0.9× |
| 자동 연속 재생 간격 | 0.5s ~ 3s | 1.0s |
| **저장공간 사용량** | 앱셸/콘텐츠/검색/IndexedDB 항목별 KB 표시 (`navigator.storage.estimate()`) | 실시간 |
| **캐시 정리** | Cache Storage만 비움 (진도·즐겨찾기 보존) | — |
| **전체 초기화** | Cache + IndexedDB 모두 삭제, 첫 진입 상태로 | — |
| 캐시 상태 / 업데이트 | 현재 버전 표시, "업데이트 확인" | — |
| 정보 | 버전, 라이선스 → About 페이지 이동 | — |

### 6.8 S-007 정보 (About)

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
│  체계를 기반으로 자체 편집·      │
│  창작되었습니다.                 │
│                                  │
│  모든 콘텐츠는 직접 창작되었으며 │
│  무단 복제 및 상업적 이용을      │
│  금합니다.                       │
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
  © ChinTalk. All content is
  self-created. All Rights Reserved.
```

### 6.9 S-008 설치 안내 모달

- iOS Safari 감지 시: "공유 → 홈 화면에 추가" 시각적 가이드
- Android Chrome: `beforeinstallprompt` 이벤트로 네이티브 설치 UI 트리거
- "다시 보지 않기" 옵션, 7일 후 재표시

### 6.10 S-009 4단계 심화 마스터리 (Deep Mastery) — 사용자 주도

**목적**: 하나의 짧은 음원(과의 본문 또는 개별 Chunk 묶음)을 완전히 내 것으로 만드는 정밀 학습.

```
┌──────────────────────────────────┐
│ ← 01. 问候   [1 Blind] ← 진행 단계│
├──────────────────────────────────┤
│  ◉ ● ○ ○  1단계 Blind            │
│                                  │
│  ╭────────────────────────╮      │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │      │  ← 자막 블러(Blur)
│  │ ▓▓▓▓ (블러 처리) ▓▓▓▓ │      │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ 🔊  │
│  ╰────────────────────────╯      │
│                                  │
│  🔊 다시 듣기   [들리는 키워드 →] │
│                                  │
│  [◀ 이전 단계]  [다음 단계 ▶]    │
└──────────────────────────────────┘
```

**4단계 흐름**:

| 단계 | 명칭 | 동작 | 핵심 인터랙션 |
|---|---|---|---|
| 1 | **Blind** | 자막 블러 처리, 음원만 재생 | "들리는 키워드를 선택하세요" — 최소 인터랙션(칩 탭) |
| 2 | **Script** | 스크립트 표시, 현재 재생 Chunk 하이라이트 | 🔊 탭 재생, Chunk 탭 시 발음 함정 💡팝업 |
| 3 | **Shadowing** | 문장 끝 자동 일시정지 → 녹음 | 녹음 후 **성조 파형(Pitch Contour) 비교**: 초록=원어민 일치, 빨강=불일치 |
| 4 | **Final Check** | 자막 다시 블러 | "처음보다 얼마나 잘 들리나요?" 5점 척도 자기 평가 |

**필수 기능**:
- **3색 형광펜 스크립트**: 사용자가 Chunk/문장을 직접 마킹 — 🟢초록(바로 이해) / 🟡노랑(헷갈림) / 🔴빨강(완전 생소). 마킹 비율로 "이해도 달성률" 시각화.
- **한국인 발음 함정 경고**: 특정 Chunk 탭 시 💡팝업. 예: `q는 '츄'가 아님 (혀끝이 아랫니 뒤)`, `和 hé는 '훠'에 가까움`, `r은 '얼'이 아니라 혀를 말아 '르'`.

**데이터**: `Lesson.traps[]`(발음 함정), `Lesson.body[].chunks[]`(Chunk), `zh-tts-manifest.json` + `zh-timestamps.json`(Chunk↔타임스탬프).

### 6.11 S-010 10분 데일리 루틴 (Daily Routine) — 시스템 주도

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
| 2분 | 표현 확인 | 모르는 표현 → **탭하여 🔴북마크만** (사전 검색 금지, 좌절 방지) |
| 2분 | 리듬 따라가기 | 소리 덩어리(Chunk) 의미 파악 + 리듬 따라 읽기 |
| 2분 | 쉐도잉 | 문장별 쉐도잉 (간단 녹음 또는 입술 움직임) |
| 2분 | 마무리 | 자막 없이 최종 재청취 + 완료 축하 |

**원칙**:
- 단계 간 전환은 타이머 자동 + "다음 단계: X" 부드러운 하단 토스트
- 🔴북마크는 나중에 모드1(Deep Mastery)에서 정밀 학습할 대상으로 자동 수집
- 매일 완료 시 연속 학습(스트릭) 배지 갱신

### 6.12 S-011 편하게 듣기 (Passive Listening)

**해금 조건**: 모드1(4단계) 또는 모드2(10분)를 **완료한 음원만** 재생 가능. → "이미 익숙한 소리"를 배경으로 반복 노출.

- **상황별 큐레이션**: 🎧출근길 지하철용 / 🎧설거지·청소용 / 🎧잠들기 전 자장가용
- **백그라운드 재생**: PWA 오디오 세션으로 화면 잠금·다른 앱 사용 중에도 재생
- **반복 모드**: 단일 음원 반복 / 전체 플레이리스트 순차 / 랜덤
- **플레이리스트**: 해금된 음원을 `passiveTags` 기준으로 자동 구성

### 6.13 S-008 단어장 (Dictionary)

**목적**: 공통 단어장(`Doc/Dictionary/`)을 탐색·검색하는 사전 화면. 과 진입 없이도 단어를 찾아볼 수 있다.

```
┌──────────────────────────────────┐
│ ← 단어장                    ⚙   │
│  [ 🔍 한자·병음·한국어 검색 ]    │
├──────────────────────────────────┤
│  A B C D E F G H J K L M N       │  ← 병음 초성 인덱스
│  O P Q R S T W X Y Z             │
├──────────────────────────────────┤
│  好  hǎo          [형용사] 좋다  │
│  好吃 hǎochī        맛이 좋다    │
│  好极了 hǎo jí le   아주 좋다    │
│  ...                             │
│         🔊 (행 탭 → 단어 카드)   │
└──────────────────────────────────┘
```

- **검색**: 한자·병음·한국어로 실시간 검색 (MiniSearch)
- **초성 인덱스**: 병음 초성(A~Z)으로 빠른 이동
- **행 탭** → 단어 카드 바텀시트 (다의어 번호 매김 + 🔊 + ⭐)
- 데이터: `word-dict.json` (§5.6)

### 6.14 S-009 내 단어장 (My Words)

**목적**: 사용자가 마킹한 단어를 모아 복습. PRD의 3색 형광펜·즐겨찾기 메커니즘의 "수집·복습 허브".

```
┌──────────────────────────────────┐
│ ← 내 단어장                      │
│  [전체] [🔴완전생소] [🟡헷갈림]  │  ← 필터 칩
│  [🟢바로이해] [⭐즐겨찾기]        │
├──────────────────────────────────┤
│  🔴 谢谢   xièxie   감사하다 🔊  │  ← 완전 생소 우선 정렬
│  🔴 怎么样 zěnmeyàng 어떠세요 🔊 │
│  🟡 好久不见 hǎojiǔ bú jiàn 🔊   │
│  ⭐ 早上好 zǎoshang hǎo 🔊       │
│                                  │
│  [🔊 전체 듣기]  [복습 시작 ▶]  │
└──────────────────────────────────┘
```

- **필터**: 3색 형광펜(🔴🟡🟢) + ⭐즐겨찾기
- **정렬**: 🔴(완전 생소) → 🟡 → 🟢 → ⭐ 순 (복습 우선순위)
- **행 탭** → 단어 카드 바텀시트, **복습 후 마킹 색 전환** (🔴→🟡→🟢) — 성취감 유도
- **전체 듣기**: 마킹 단어를 연속 TTS 재생 (이동 중 복습)
- 데이터: `useHighlightStore`(3색 형광펜) + `useFavoriteStore`(⭐) + `word-dict.json`

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

**큰글씨 모드**: CSS 변수 `--font-scale` 적용 (1.0 / 1.2 / 1.4 / 1.6) → 모든 폰트 사이즈에 곱셈.

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
      © ChinTalk. All content is self-created. All Rights Reserved.
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
{ fontScale, theme, displayMode, ttsVoiceZh, ttsVoiceKo, ttsRate, autoplayGap, chunkGap }

// stores/useProgressStore.ts
{ completed: Set<lessonId>, lastLessonId, scrollPositions: Record<id, number> }

// stores/useFavoriteStore.ts
{ chunks: Set<chunkId>, words: Set<wordId> }

// stores/useSrsStore.ts
{ cards: Record<wordId, { box: 1-5, nextReview: ISO date, history: [] }> }

// stores/useHighlightStore.ts  (3색 형광펜)
{ marks: Record<chunkId, "green" | "yellow" | "red"> }

// stores/useMasteryStore.ts     (4단계 마스터리)
{ stage: Record<lessonId, 1|2|3|4>, selfRating: Record<lessonId, 1|2|3|4|5> }

// stores/useStreakStore.ts      (연속 학습)
{ streakDays: number, lastDoneDate: ISO date, badges: string[] }

// stores/usePassiveStore.ts     (편하게 듣기)
{ unlocked: Set<lessonId>, playlistPresets: Record<tag, lessonId[]> }

// stores/useTTSStore.ts (runtime only)
{ voices: SpeechSynthesisVoice[], isSpeaking, currentUtterance }
```

모든 store는 `persist` 미들웨어로 IndexedDB 동기화. TTS 스토어만 메모리 전용.

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

소리 덩어리(구절)가 최소 합성·재생 단위이며, `zh-tts-manifest.json`에 `{ "我要去图书馆": "27df1ce63cbd.mp3", ... }` 형태로 매핑된다. 문장은 1개 이상의 구절로 구성되며, 4가지 재생 모드가 모두 **구절 mp3의 조합**으로 동작한다.

| 모드 | 동작 | 구절 간격 | 용도 |
|---|---|---|---|
| **구절 듣기** 🔹 | 단일 구절 1회 재생 | — | 세밀한 따라하기 |
| **문장 듣기** 🔊 | 문장 내 구절 순차 재생 | 80ms | 문장 전체 흐름 |
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
| zh-CN 보이스 0개 | "중국어 음성 미설치" 카드 + OS 설정 가이드 |

### 9.4 취소·에포크 메커니즘

`speakEpoch` 카운터로 모든 비동기 분기를 추적. `stop()` 호출 시 epoch 증가 → 이전 분기 결과를 무시하여 빠른 연속 탭의 race condition 방지.

### 9.5 Chunking 엔진 (구절 분할 + 타임스탬프 매핑)

두 학습 모드가 공통으로 사용하는 **소리 덩어리(Chunk) 인프라**.

- **1차: 콘텐츠 기반 분할** — 마크다운 소스의 `／` 구분자(원어민 검수)를 파서가 `Verse.chunks[]`로 분리. 신뢰도 높은 의미 단위.
- **2차: NLP 기반 분할** — `／` 구분자가 없는 문장은 빌드타임에 경량 규칙/사전(품사·구 경계) 기반으로 보조 분할 (Phase 2 옵션, 필수 아님).
- **타임스탬프 매핑** — 각 구절을 개별 mp3로 합성한 뒤, 문장 전체 mp3 안에서 구절 경계의 `startMs/endMs`를 정합(정렬)하여 `zh-timestamps.json` 생성. 스크립트 화면의 "현재 재생 Chunk 하이라이트"가 이 타임스탬프로 동작.

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

### 9.6 성조 파형 비교 (Pitch Contour) — 쉐도잉 피드백

모드1의 3단계(Shadowing)에서 사용자 녹음과 원어민 음성의 성조 궤적을 비교한다.

- **입력**: 원어민 구절 mp3 + 사용자 마이크 녹음(MediaRecorder, WebM/Opus)
- **추출**: `Pitchy`(Web Audio 기반, 경량) 또는 `ML5 PitchDetection`(크레프 피치 검출)로 F0(기본 주파수) 시계열 추출
- **비교**: 두 F0 궤적을 시간 정규화 후 상관도 계산. 구간별로 원어민 성조(음높이 흐름)와 사용자의 궤적이 일치하면 **초록**, 어긋나면 **빨강**으로 표시
- **표시**: 성조 다이어그램(상/중/하 3단계) 위에 원어민 곡선(점선) + 사용자 곡선(실선) 오버레이
- **한계/폴백**: 마이크 권한 거부·`Pitchy` 미지원 시 "간단 녹음(재생만)"으로 폴백. 성조 정확도는 참고용이며 정량 점수화하지 않음(좌절 방지)

---

## 10. PWA · 오프라인 · 캐싱 전략

> **공통 전제**: GitHub Pages subpath 배포이므로 모든 절대 경로는 `/ChinTalk/` 프리픽스. Vite `base: "/ChinTalk/"` 설정 필수.

### 10.1 Service Worker 정책 (Workbox) — 디스크 점유 최소화

**원칙**: install 시점에는 **앱 셸 + vol1**만 precache. 나머지는 사용자가 실제 진입한 vol만 캐시.

| 리소스 | 전략 | install 시 precache | 디스크 점유 시점 |
|---|---|---|---|
| HTML, 초기 JS/CSS, 아이콘 SVG | precache | ✅ (≈ 150KB) | 설치 즉시 |
| `lessons-meta.json` (타이틀만, ≈ 15KB) | precache | ✅ | 설치 즉시 |
| `lessons-vol1.json` (≈ 150KB) | CacheFirst | ✅ | 설치 즉시 |
| `lessons-vol2.json` ~ `vol8.json` | CacheFirst | ❌ | 각 vol 첫 진입 시 |
| `search-index.json` (≈ 300KB) | CacheFirst | ❌ | 검색 첫 사용 시 |
| 마스커블 PNG (≈ 12KB) | precache | ✅ | 설치 즉시 |

**CacheFirst 만료 정책**: `expiration: { maxEntries: 10, maxAgeSeconds: 60*60*24*90 }` (90일)

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

## 11. 검색 설계

### 11.1 인덱싱 (빌드 타임)

```ts
const idx = new MiniSearch({
  fields: ["zh", "pinyin", "ko"],
  storeFields: ["lessonId", "section", "chunkIdx", "zh", "pinyin", "ko"],
  tokenize: (text, field) => {
    if (field === "zh") return text.split(""); // 한자 1글자 단위
    if (field === "pinyin") return text.toLowerCase().split(/[\s']+/);
    return text.toLowerCase().split(/\s+/);
  },
});
```

### 11.2 런타임 검색
- 입력 debounce 200ms
- `idx.search(query, { prefix: true, fuzzy: 0.2 })`
- 결과 최대 50개, 가상 스크롤
- 한자/병음/한글 자동 감지하여 필드 가중치 조정

---

## 12. 진도·즐겨찾기·SRS 데이터 모델

### 12.1 IndexedDB 키 구조 (idb-keyval)

| 키 | 값 |
|---|---|
| `settings` | SettingsState (JSON) |
| `progress` | ProgressState |
| `favorites` | FavoriteState |
| `srs` | SrsState |
| `lastVisit` | ISO date |

### 12.2 SRS 카드 생성 트리거
1. 사용자가 단어/관련단어 섹션에서 "📥 카드에 추가" 탭
2. 자동 추가 옵션 (설정): 과 완료 시 그 과의 모든 단어 자동 Box1 투입

### 12.3 일일 큐 계산
```ts
function todayDue(srs: SrsState): WordId[] {
  const today = new Date().toISOString().slice(0, 10);
  return Object.entries(srs.cards)
    .filter(([_, c]) => c.nextReview <= today)
    .map(([id]) => id);
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
│   │   ├── build-search-index.ts   ← MiniSearch 사전 빌드
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
│       │   ├── search-index.json
│       │   ├── zh-tokens.json
│       │   └── zh-tts-manifest.json
│       ├── stores/
│       │   ├── useSettingsStore.ts
│       │   ├── useProgressStore.ts
│       │   ├── useFavoriteStore.ts
│       │   ├── useSrsStore.ts
│       │   └── useTTSStore.ts
│       ├── lib/
│       │   ├── tts.ts
│       │   ├── srs.ts
│       │   ├── search.ts
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
│       │   └── InstallPrompt.tsx
│       ├── pages/
│       │   ├── HomePage.tsx
│       │   ├── TocPage.tsx
│       │   ├── LessonPage.tsx      ← lazy
│       │   ├── SearchPage.tsx      ← lazy
│       │   ├── FlashcardsPage.tsx  ← lazy
│       │   ├── SettingsPage.tsx
│       │   └── AboutPage.tsx
│       ├── hooks/
│       │   ├── useTTS.ts
│       │   ├── useInstallPrompt.ts
│       │   └── useScrollProgress.ts
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
        globPatterns: ['**/*.{js,css,html,svg,webp,json}'],
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
          search: ['minisearch'],
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
| iOS Safari | 16.4+ | 전체 | Web Push 가능 (Phase 3 옵션) |
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
| 초기 JS gzip | < 150 KB |
| 콘텐츠 JSON gzip | < 600 KB |
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
      - run: npm run build:search        # MiniSearch 사전 인덱스 빌드
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
| 유닛 테스트 | Vitest | 핵심 유틸 (검색, SRS, TTS epoch) |
| 콘텐츠 검증 | verify:tts + 커스텀 스크립트 | mp3 누락·섹션 순서·3줄 패턴 검사 |
| E2E 스모크 | 수동 | 주요 화면 + PWA 설치 + 오프라인 |
| 접근성 | 수동 | 큰글씨 + 다크모드 + 스크린리더 |

---

## 19. 화면별 수용 기준 (Acceptance Criteria)

### S-001 홈
- [ ] 오늘의 한 마디 랜덤 노출
- [ ] 이어 학습하기 카드 표시 (마지막 학습 과)
- [ ] 권 선택 타일 5개 정상 동작
- [ ] 오늘의 복습 카운트 표시 (0장일 때 "복습 없음")
- [ ] 하단 탭바 5개 아이콘 정상 동작

### S-002 목차
- [ ] 8개 권 탭 전환
- [ ] 각 과 행: 번호·제목·완료·즐겨찾기 표시
- [ ] 진도 도넛 (vol별 % + 전체 %)

### S-003 과 상세
- [ ] 본문 말뭉치 카드 스택 (한자/병음/한글)
- [ ] 표시 모드 토글 (전체/한자+병음/한자만)
- [ ] 🔊 단일·길게 누름(한국어) 재생
- [ ] ▶▶ 전체 연속 재생
- [ ] 섹션 탭 5개 (본문/단어/관련단어/어법/회화)
- [ ] 즐겨찾기 토글 + SRS 카드 추가
- [ ] 이전/다음 과 이동 + 좌우 스와이프
- [ ] 70% 스크롤 시 완료 표시

### S-004 검색
- [ ] 한자·병음·한글 검색
- [ ] 필터 칩 동작
- [ ] 결과 탭 시 해당 말뭉치로 점프

### S-005 플래시카드
- [ ] 앞면 한자 + 🔊 / 뒷면 병음·뜻
- [ ] Leitner 5박스 알고리즘
- [ ] 마스터 처리

### S-006 설정
- [ ] 글자 크기 4단계 / 다크모드 / 표시모드
- [ ] TTS 속도·간격 조절
- [ ] 저장공간 사용량·캐시 정리·초기화

### S-007 정보
- [ ] 버전·빌드 정보
- [ ] 콘텐츠 출처 안내문
- [ ] 오픈소스·개인정보 안내
- [ ] Footer 저작권 전역 적용

### S-008 설치 안내
- [ ] iOS 가이드 / Android 네이티브 설치
- [ ] "다시 보지 않기" 7일 후 재표시
