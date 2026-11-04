# ChinTalk — 소리로 배우는 중국어 구조화 듣기

문장을 **의미 단위(청크)** 로 쪼개 듣고, 한자·병음·한글을 켜고 끄며 따라 말하는 중국어 학습 PWA입니다.
설치하면 인터넷 없이도 사용할 수 있고, 모바일에 최적화되어 있습니다. 학습용 무료 앱입니다.

👉 **https://mykim711231.github.io/ChinTalk/**

---

## ✨ 주요 기능

- **구조화 듣기** — 본문 → 단어 → 문법 → 회화 → 발음 함정 순서의 한 과 구성, 문장별 스피커 재생
- **표시 토글** — 한자 / 병음 / 한글을 칩으로 즉시 켜고 끄기 (듣기만 연습하기 좋음)
- **사전 합성 음성(mp3)** — 단말기에 중국어 음성팩이 없어도 재생, 없는 문장은 기기 음성(Web Speech)으로 대체, 속도 조절
- **형광펜** — 이해도(초록/노랑/빨강)를 카드에 표시
- **학습 경로** — 8권 160과를 4개 레벨로 구성, 진도 자동 기록
- **눈이 편한 화면** — 글자 크기 3단계, 청색광 차단 4단계
- **백업 / 복원** — 진도·형광펜·설정을 JSON 파일로 저장하고 새 기기에서 복원
- **QR 공유**, 인앱 브라우저(카카오톡 등) 감지 안내, 도움말 검색
- **PWA** — 홈 화면에 설치, 오프라인 사용 (Workbox)

## 📚 학습 구성

| 레벨 | 권 | 주제 |
|---|---|---|
| Lv.1 왕초보 귀 트이기 | vol1–2 | 기초 일상, 생활 회화 |
| Lv.2 중국어 벽 뚫기 | vol3–4 | 여행 회화, 비즈니스 회화 |
| Lv.3 네이티브 리듬 정복 | vol5–6 | 고급·실무 회화, 네이티브 표현 |
| Lv.4 프리토킹 마스터 | vol7–8 | 의사소통 기능, 시사·논증 |

한 권은 20과, 전체 160과입니다. 음성은 현재 vol1부터 순차적으로 합성해 추가하고 있습니다.

## 📲 설치 방법

- **Android (Chrome)** — 메뉴(⋮) → 홈 화면에 추가 / 앱 설치
- **iPhone / iPad (Safari)** — 공유(↑) → 홈 화면에 추가
- **PC (Chrome · Edge)** — 주소창 오른쪽의 설치(⊕) 아이콘

카카오톡 등 앱 안의 브라우저에서는 설치와 음성이 제한됩니다. 주소를 복사해 Chrome/Safari에서 열어 주세요.

---

## 🛠 개발

React 18 · Vite 5 · TypeScript · Zustand · Tailwind CSS 3 · vite-plugin-pwa · HashRouter

```bash
cd app
npm install
npm run dev          # 개발 서버 (http://localhost:5173/ChinTalk/)
npm run build        # 콘텐츠 빌드 + 타입 검사 + 프로덕션 빌드
```

### 디렉터리

```
Doc/Markdown/vol{1..8}/   학습 콘텐츠 원본 (Markdown)
Doc/_design.md            설계 문서
app/scripts/              build-content.ts (MD → JSON), build-tts.ts (mp3 합성)
app/public/data/          빌드된 lessons-vol*.json, lessons-meta.json, zh-tts-manifest.json
app/public/tts/           사전 합성 mp3 (파일명 = sha1(정규화한 중국어).slice(0,12))
app/src/                  pages · components · stores · lib
```

### 음성(mp3) 합성

```bash
cd app
npm run build:tts    # msedge-tts (zh-CN-XiaoxiaoNeural, 48kbps mono) 로 합성, 이미 있는 파일은 건너뜀
```

재생 시 manifest에서 mp3를 찾고, 없으면 Web Speech API로 대체합니다.

### 배포

`main` 브랜치에 푸시하면 GitHub Actions(`.github/workflows/deploy.yml`)가 빌드해 GitHub Pages에 자동 배포합니다.

---

## 📄 라이선스 · 제작 안내

- **소스 코드**: MIT License ([LICENSE](LICENSE))
- 학습 콘텐츠는 **AI(DeepSeek)의 도움으로 제작한 뒤 직접 검수·편집**했습니다. 오류를 발견하시면 이슈로 알려 주세요.
- 음성은 Microsoft Edge Neural TTS(Xiaoxiao)로 합성했습니다. 학습용 무료 앱으로 제공하며, 수익화 시 정식 서비스(Azure)로 재합성할 예정입니다.
- 단어 사전 데이터(`word-dict.json`)는 별도로 **CC BY-SA 4.0** 을 따릅니다 (추가 시 출처 표기).
