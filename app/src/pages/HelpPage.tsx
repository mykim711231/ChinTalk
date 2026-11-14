import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { cn } from '../components/ui';
import { speak } from '../lib/tts';
import { isIOS } from '../lib/inapp';

type Item = { id: string; icon: string; title: string; subtitle: string; keywords: string; body: ReactNode };

const L = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="text-brand font-semibold underline">{children}</Link>
);
const Tip = ({ children }: { children: ReactNode }) => (
  <p className="text-xs text-slate-500 mt-2 inline-flex gap-1.5"><Icon name="bulb" size={14} className="shrink-0 mt-0.5" /><span>{children}</span></p>
);
const Box = ({ children }: { children: ReactNode }) => (
  <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-slate-800">{children}</div>
);

function Accordion({ title, subtitle, icon, open, onToggle, children }: {
  title: string; subtitle?: string; icon: string; open: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-brand-50/50">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold inline-flex items-center gap-2"><Icon name={icon} size={18} className="text-brand" />{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <Icon name="chevronDown" size={22} className={cn('flex-none text-slate-400 transition-transform mt-0.5', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-slate-200 p-4 space-y-3 text-sm">{children}</div>}
    </section>
  );
}

function AudioTest() {
  const [state, setState] = useState<'idle' | 'played'>('idle');
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => { void speak('你好，我是中文。'); setState('played'); }}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand text-white text-sm font-semibold px-4 py-2">
        <Icon name="speaker" size={16} /> 테스트 재생
      </button>
      {state === 'played' && <span className="text-xs text-slate-500">소리가 들리나요? 안 들리면 아래 항목을 확인하세요.</span>}
    </div>
  );
}

const GUIDES: Item[] = [
  {
    id: 'structure', icon: 'map', title: '이 앱은 어떻게 학습하나요?',
    subtitle: '한 과는 본문 → 단어 → 문법 → 회화 → 발음 함정 순서예요.',
    keywords: '학습 방법 본문 단어 문법 회화 발음 함정 레벨 과 구조 청크 형광펜 학습 듣기 5회 10회 반복 소리만 따라 말하기 병음 한글 한자',
    body: (
      <>
        <Box>
          <p>ChinTalk는 <b>눈이 아니라 귀로 먼저</b> 익히는 구조화 듣기 앱입니다. 문장의 의미 단위를 확인하며 듣고, 한자·병음·한글을 켜고 끌 수 있어요.</p>
        </Box>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><b>본문</b> — 스피커 버튼으로 문장을 듣고, 한자·병음·한글 칩으로 보이는 정보를 조절합니다.</li>
          <li><b>단어 · 문법 · 회화</b> — 본문에 나온 어휘, 핵심 문형, 대화문입니다.</li>
          <li><b>발음 함정</b> — 한국인이 자주 틀리는 발음을 짚어 줍니다.</li>
          <li><L to="/study">학습 메뉴</L>에서 과를 고르고 학습을 시작해요. <b>본문 / 회화 / 본문+회화</b> 선택은 10분 데일리·편하게 듣기 화면에 있어요. 심화 학습은 항상 본문+회화로 진행해요. 본문+회화는 본문 다음에 회화를 학습해요.</li>
          <li><b>10분 데일리</b>는 스크립트·표현 확인·리듬·쉐도잉 단계에서 간체 바로 위에 병음을 표시해요. 대상을 바꾸면 첫 단계부터 다시 시작해요.</li>
          <li><b>심화 학습</b>은 듣고 이해 퀴즈(한글/간체 선택) → 보고 떠올리기(한글/간체 선택) → 따라 말하기 순서로 진행해요. 떠올리기는 본문은 무작위, 회화는 순서대로 나오고 끝난 뒤 다시 도전할 수 있어요. 퀴즈에서 틀리거나 떠올리기에서 못함으로 남긴 문장은 <L to="/review">심화 학습 복습</L>에서 언제든 다시 확인할 수 있어요. 복습은 듣고 이해(한글/간체)와 떠올리기(한글/간체) 4가지로 나뉘어 있고, 모두 통과해야 익힌 것으로 빠져요. 따라 말하기에서는 간체 위 병음과 의미단위 표시를 확인할 수 있어요.</li>
          <li><b>전체 듣기</b>를 재생하면 본문·회화와 심화 학습의 따라 말하기에서 현재 문장을 자동으로 따라가요. 재생 중인 문장을 테두리로 표시하고, 위쪽의 <b>멈추기</b> 버튼으로 중단할 수 있어요.</li>
          <li>과 화면에서 전체 듣기 옆의 <b>본문·회화 10회 학습 듣기</b>는 선택한 내용 전체를 열 번 들어요. <b>모두 표시</b>를 두 번 들어 뜻을 먼저 익힌 뒤 → <b>소리만</b>(화면 가림) → 한자·병음(뜻 숨김) → <b>한자만 따라 말하기</b> → <b>소리만 따라 말하기</b> → <b>한자만 먼저 읽고 확인</b> → <b>한글만</b> → 모두 표시 → <b>한글만(순서 섞음)</b> 순서예요. <b>따라 말하기</b>는 재생한 시간만큼 쉬어 주니 그동안 소리 내어 따라 읽어 보세요. <b>한자만 먼저 읽고 확인</b>은 한자만 보고 먼저 읽어 본 뒤 음성으로 맞는지 확인하고, <b>한글만</b>은 한글을 먼저 보여 주고 문장 길이에 맞춰 잠시 뒤 음성이 나와서 중국어를 떠올린 뒤 확인할 수 있어요. 회화는 앞 대사가 단서라서 마지막 한글만도 순서를 섞지 않아요. <b>단어 5회 학습 듣기</b>는 소리만·순서 섞기 없이 모두 표시 → 한자·병음 → 병음만 → 한자만(따라 말하기) → 한글만 순서예요. 마지막 회차는 한글을 먼저 보여 주고 잠시 뒤 음성이 나와서, 중국어를 떠올린 뒤 확인할 수 있어요. 현재 회차·문장과 자동 스크롤을 제공하며, 마치거나 중단하면 기존 표시 설정으로 돌아와요. 기본 학습 모드에서도 사용할 수 있어요.</li>
          <li><b>문법·발음 함정</b> 탭에도 <b>전체 듣기</b>와 <b>한글 해설 듣기</b>가 있어요. 문법은 예문(중국어)을, 발음 함정은 중국어 대상을 읽고, 해설 듣기는 줄마다 한글 설명을 이어서 읽어요. 한글 음원이 없는 줄은 기기의 한국어 음성으로 읽어요. 이 두 탭에는 학습 듣기(회차 반복)가 없어요.</li>
          <li><b>본문·회화</b> 탭의 <b>본문 + 한글 듣기</b>, <b>회화 + 한글 듣기</b>는 문장마다 중국어를 읽은 뒤 한글 번역을 이어서 읽어요. 한글 음원이 없는 문장은 기기의 한국어 음성으로 읽어요.</li>
          <li><b>쉐도잉 녹음</b>: 마이크 권한 확인 → 녹음 → 녹음 끝 → 내 소리·번갈아 듣기. PC에서도 권한을 허용하면 녹음돼요. 차단했다면 주소창 왼쪽 사이트 설정에서 마이크를 허용하세요. 녹음은 과·대상을 바꾸거나 학습을 나가면 삭제돼요.</li>
          <li>마지막에 <b>"이 과 완료로 표시"</b>를 누르면 진도에 반영됩니다.</li>
        </ul>
        <Tip>듣기 → 가리고 따라 말하기 → 확인 순서로 반복하면 효과가 큽니다. 처음엔 병음과 한글을 켜고, 익숙해지면 끄세요.</Tip>
      </>
    ),
  },
  {
    id: 'highlight', icon: 'check-circle', title: '형광펜(이해도 표시) 사용법',
    subtitle: '듣기 버튼 아래 동그라미를 눌러 이해도를 표시해요.',
    keywords: '형광펜 이해도 표시 초록 노랑 빨강 북마크 동그라미 색',
    body: (
      <>
        <p>문장 카드의 듣기 버튼 아래 동그라미를 누를 때마다 색이 바뀝니다.</p>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full bg-green-600" /> <b>초록</b> — 바로 이해됨</li>
          <li className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full bg-yellow-500" /> <b>노랑</b> — 헷갈림</li>
          <li className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full bg-red-600" /> <b>빨강</b> — 완전 생소 (북마크)</li>
          <li className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" /> <b>없음</b> — 표시 안 함 (한 바퀴 돌면 해제)</li>
        </ul>
        <Tip>표시는 이 기기에만 저장됩니다. 기기를 바꿀 땐 <L to="/settings">설정</L>의 백업을 사용하세요.</Tip>
      </>
    ),
  },
  {
    id: 'display', icon: 'settings', title: '한자·병음·한글 표시 바꾸기',
    subtitle: '본문 위 칩, 또는 설정에서 기본값을 정해요.',
    keywords: '한자 병음 한글 표시 숨기기 칩 토글 글자 크기 큰글씨 청색광 블루라이트',
    body: (
      <>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>과 화면 위쪽의 <b>한자 · 병음 · 한글</b> 칩을 누르면 바로 켜고 꺼집니다. 병음은 글자 위에 한 글자씩 표시돼요.</li>
          <li>한자 글자를 <b>탭</b>하면 그 글자가 들어간 단어의 뜻·한자 풀이·예문을 단어장 시트로 볼 수 있어요.</li>
          <li><b>의미단위 표시</b>를 켜면 <span lang="zh-Hans" className="font-hanzi">我是 / 韩国人。</span>처럼 의미가 이어지는 묶음을 보여 줘요. 단위를 고를 필요 없이 켜기/끄기만 하면 돼요. 전체 듣기는 문장 그대로 재생해요.</li>
          <li><b>설정 → 한글 음성</b>을 켜면 10분 데일리·편하게 듣기·심화 학습에서 중국어 다음에 한글 번역을 읽어 줘요.</li>
          <li>기본값은 <L to="/settings">설정 → 화면</L>에서도 바꿀 수 있어요.</li>
          <li><b>글자 크기</b>는 보통 / 크게 / 아주 크게 3단계, <b>청색광 차단</b>은 4단계입니다.</li>
        </ol>
        <Tip>한자만 보고 외우려면 병음·한글을 끄고, 듣기만 연습하려면 셋 다 끄고 소리에 집중해 보세요.</Tip>
      </>
    ),
  },
  {
    id: 'audio', icon: 'speaker', title: '음성이 안 들려요',
    subtitle: '기기 음성·녹음 음성 선택과 오프라인 음성팩 안내.',
    keywords: '음성 소리 안 들려요 tts mp3 무음 볼륨 음성팩 속도 느리게 무음모드 ios 아이폰',
    body: (
      <>
        <Box>
          <p>기본값은 <b>기기 음성</b>입니다. <L to="/settings">설정 → 음성 재생 방식</L>에서 <b>녹음 음성</b>으로 바꾸면 미리 합성된 mp3를 재생합니다.</p>
        </Box>
        <AudioTest />
        <p className="font-bold pt-1">확인 순서</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>기기 볼륨과 <b>무음(진동) 모드</b>를 확인하세요. {isIOS() && '아이폰은 무음 스위치가 켜져 있으면 소리가 나지 않을 수 있어요.'}</li>
          <li>카카오톡·네이버 등 <b>앱 안에서 연 화면</b>이면 음성이 제한됩니다. Chrome/Safari에서 열어 주세요.</li>
          <li><b>기기 음성</b>은 스마트폰에 중국어 음성팩을 설치해야 오프라인에서 들을 수 있어요. 설정의 <b>중국어 음성 선택</b>에서 기기 음성을 고르세요.</li>
          <li><b>녹음 음성</b>은 설정의 <b>자동 설치·오프라인 저장</b>에서 저장 완료 여부를 확인하세요. 받지 못한 파일은 <b>음원 다시 받기</b>로 이어받아요. 기기 음성으로 바꾸면 자동 다운로드를 멈춰요.</li>
        </ol>
        <p>너무 빠르게 들리면 <L to="/settings">설정 → 음성</L>에서 <b>속도</b>를 0.80× 정도로 낮춰 보세요.</p>
      </>
    ),
  },
  {
    id: 'install', icon: 'download', title: '앱으로 설치하기',
    subtitle: '전권 자료 자동 저장 후 홈 화면에 추가해 사용해요.',
    keywords: '설치 홈 화면 추가 삼성 인터넷 삼성인터넷 Play 프로텍트 안전하지 않은 앱 차단 경고 pwa iphone android windows mac safari chrome edge 오프라인',
    body: (
      <ul className="space-y-2">
        <li>첫 접속 때 <b>전권 교재·단어장·음원 목록</b>을 자동 저장해요. <b>녹음 음성</b>을 선택하고 자동 저장을 켰을 때만 녹음 음원을 자동으로 이어서 저장해요. 기기 음성에서는 받지 않아요.</li>
        <li>기존에 설치한 앱도 자동으로 새 버전을 받아요. <b>설정 → 앱 업데이트</b>에서 현재 버전과 <b>업데이트 확인</b>을 볼 수 있어요. <b>새 버전 적용·다시 열기</b>를 누르면 다른 창을 모두 닫지 않아도 적용돼요. 학습 진도·설정·저장한 음원은 유지돼요.</li>
        <li>홈 화면 아이콘 추가는 브라우저의 <b>설치</b> 또는 <b>추가</b> 버튼을 직접 눌러야 해요.</li>
        <li><b>Android (Chrome)</b> — 메뉴(⋮) → <b>홈 화면에 추가</b> 또는 <b>앱 설치</b></li>
        <li><b>설치한 앱이 바로 닫히거나 Android 8·9 기기라면</b> — 아래 <b>구형 Android·Chrome 기기에서 사용하기</b> 항목의 Chrome 바로가기 방법을 확인하세요.</li>
        <li><b>삼성 인터넷으로 설치하면</b> “안전하지 않은 앱 차단됨” 경고가 날 수 있어요. 앱 문제가 아니라 삼성 인터넷이 만드는 설치 껍데기의 대상 Android 버전 때문이에요. <b>무시하고 설치하기</b>를 누르거나, 기존 아이콘을 지우고 <b>Chrome</b>에서 다시 설치하세요.</li>
        <li><b>iPhone / iPad (Safari)</b> — 공유(↑) → <b>홈 화면에 추가</b></li>
        <li><b>PC (Chrome·Edge)</b> — 주소창 오른쪽의 <b>설치(⊕)</b> 아이콘</li>
        <li className="text-xs text-slate-500">카카오톡 등 인앱 브라우저에서는 설치가 안 됩니다. 주소를 복사해 Chrome/Safari에서 여세요.</li>
      </ul>
    ),
  },
  {
    id: 'older-android', icon: 'help', title: '구형 Android·Chrome 기기에서 사용하기',
    subtitle: '기본 학습·듣기만 제공하며 전체 기능은 최신 환경을 권장해요.',
    keywords: '구형 오래된 태블릿 안드로이드 Android 8 Android8 Android 8.0 Android 9 Android9 Chrome 크롬 138 크롬138 지원 종료 설치 실행 안됨 바로 닫힘 꺼짐 바로가기 호환 모드 기본 모드 기본모드 기본 학습 모드 기능 제한 최신 버전 Huawei 화웨이 AGS2-L09 WebAPK',
    body: (
      <>
        <Box>
          <p><b>Android 8·9는 Chrome 138이 마지막 지원 버전</b>이에요. Chrome 139부터는 Android 10 이상이 필요해요. 이 기기에서는 Chrome을 업데이트해도 최신 버전까지 올라가지 않을 수 있어요.</p>
          <a href="https://groups.google.com/a/chromium.org/g/chromium-dev/c/vEZz0721rUY" target="_blank" rel="noopener noreferrer" className="inline-block text-brand font-semibold underline mt-2">Google Chrome 팀의 지원 종료 안내 (인터넷 연결 필요)</a>
        </Box>
        <p><b>전체 기능은 지원 중인 Android와 최신 Chrome에서 이용해 주세요.</b> Android 9 이하 또는 Android의 Chrome 138 이하에서는 기본 학습 모드로 자동 실행해요. 브라우저 호환 모드 주소도 기본 학습 모드로 열려요.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><b>사용 가능</b> — 본문·단어·문법·회화·발음 함정, 한자 위 병음·의미단위 표시, 문장별·전체 듣기, 편하게 듣기, 진도 저장·백업.</li>
          <li><b>제한</b> — 10분 데일리, 심화 학습, 심화 학습 복습, 마이크 녹음, 잠금화면 재생 조작, 설치형 앱 설치 안내. 편하게 듣기는 고급 학습 완료 없이 전체 과를 바로 들을 수 있어요.</li>
          <li><b>최신 앱 유지</b> — 기본 모드도 같은 최신 ChinTalk로 업데이트돼요. 별도의 구버전 앱을 설치하지 않아요. 교재·음원 오프라인 저장은 기기에서 지원하는 범위에서 이용하며, 기기 음성은 설치된 음성팩이 필요해요.</li>
        </ul>
        <p>Chrome을 더 이상 업데이트할 수 없는 기기에서는 기본 모드로 이용해 주세요. <b>기존 설치 앱이 정상 작동하면 그대로 사용해도 돼요.</b> 앱 업데이트만으로 Android·Chrome 지원 종료가 해결되지는 않아요.</p>
        <p><b>설치 아이콘을 누르면 잠깐 열렸다 닫히지만 Chrome에서는 정상 작동한다면</b>, 설치형 앱과 기기의 호환 문제일 수 있어요. Chrome으로 여는 바로가기를 사용해 보세요.</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>카카오톡 등 앱 안의 브라우저가 아닌 <b>Chrome</b>에서 ChinTalk 사이트를 직접 열어 정상 실행되는지 확인하세요.</li>
          <li>Play 스토어에서 <b>이 기기에 제공되는 Chrome 업데이트</b>를 확인하세요. Chrome 버전은 <b>⋮ → 설정 → Chrome 정보</b>에서 볼 수 있어요.</li>
          <li><a href={`${import.meta.env.BASE_URL}browser.html#/`} className="text-brand font-semibold underline">브라우저 호환 모드 열기</a>를 누르세요. <b>설정 → 앱 업데이트</b>에서도 열 수 있어요.</li>
          <li>Chrome의 <b>⋮ → 홈 화면에 추가 → 바로가기 만들기</b>를 선택하세요. <b>앱 설치</b>와 선택지가 나뉘면 <b>바로가기 만들기</b>를 고르세요. 메뉴 이름은 Chrome 버전에 따라 달라질 수 있어요.</li>
          <li>새로 만든 <b>ChinTalk · 브라우저</b> 바로가기로 여세요. Chrome 화면에서 기본 학습 모드로 실행되며, 같은 Chrome 프로필의 학습 기록·설정·저장 자료를 사용해요. 최신 환경에서 전체 기능을 쓰려면 <b>설정 → 앱 업데이트 → 일반 주소로 열기</b>를 누르세요.</li>
        </ol>
        <Tip>바로가기를 만들기 위해 기존 앱을 삭제하거나 Chrome 사이트 데이터를 지울 필요는 없어요. 삭제·데이터 초기화가 필요하다면 먼저 <L to="/settings">설정에서 학습 기록을 백업</L>하세요. 바로가기 실행도 안 되면 Chrome에서 직접 열어 사용하세요.</Tip>
      </>
    ),
  },
  {
    id: 'backup', icon: 'upload', title: '기록 백업과 복원',
    subtitle: '기기를 바꾸기 전에 꼭 백업해 두세요.',
    keywords: '백업 복원 진도 기기 변경 이전 json 파일 데이터 삭제 초기화',
    body: (
      <>
        <p>진도·형광펜·설정은 서버가 아니라 <b>이 기기 안에만</b> 저장됩니다. 브라우저 데이터를 지우거나 앱을 삭제하면 사라져요.</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li><L to="/settings">설정 → 학습 진행상황 백업</L> → <b>백업 파일 저장</b></li>
          <li>새 기기·재설치 후 <b>백업에서 복원</b>으로 파일을 선택</li>
        </ol>
      </>
    ),
  },
  {
    id: 'update', icon: 'refresh', title: '업데이트 / 삭제',
    subtitle: '새 버전 적용 또는 앱·데이터 제거 방법.',
    keywords: '업데이트 새 버전 삭제 제거 재설치 캐시 새로고침',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li><b>업데이트</b> — 앱이 새 버전을 자동으로 받아 다음 실행에 적용해요. 바로 적용하려면 <b>설정 → 앱 업데이트 → 업데이트 확인 → 새 버전 적용·다시 열기</b>를 누르세요. 적용 후에는 홈 화면에서 다시 시작하며, 학습 진도·설정·저장한 음원은 유지돼요.</li>
        <li><b>음원만 정리</b> — 설정 → 저장 공간 → <b>다운로드한 음원 비우기</b> (교재·단어장·진도는 유지하고 자동 음원 저장은 꺼집니다)</li>
        <li><b>완전 삭제</b> — 홈 화면 아이콘을 길게 눌러 삭제. 진도까지 지우려면 설정의 <b>전체 초기화</b>를 먼저 하세요.</li>
      </ul>
    ),
  },
];

const FAQ: { q: string; a: string; keywords?: string }[] = [
  { q: '무료인가요?', a: '네, 학습용 무료 앱입니다. 광고도 회원가입도 없어요.', keywords: '무료 가격 광고 회원' },
  { q: '인터넷 없이도 되나요?', a: '전권 교재·단어장 자동 저장이 완료되면 사용할 수 있어요. 기기 음성은 해당 언어의 오프라인 음성팩이 필요하고, 녹음 음성은 미리 저장이 끝난 파일을 재생합니다. 설정에서 저장 상태를 확인하세요.', keywords: '오프라인 인터넷 데이터 음성팩 자동 저장' },
  { q: '구형 태블릿에서 설치 앱만 바로 닫혀요.', a: 'Chrome에서 사이트가 정상 실행된다면 도움말의 ‘구형 Android·Chrome 기기에서 사용하기’를 확인하세요. 브라우저 호환 모드를 열고 Chrome의 홈 화면에 추가 → 바로가기 만들기를 사용해 보세요. 구형 기기는 기본 학습·듣기를 제공하며 앱은 최신 버전으로 유지해요. 전체 기능은 지원 중인 Android와 최신 Chrome에서 이용해 주세요.', keywords: '구형 태블릿 안드로이드 Android8 Android9 지원 종료 설치 실행 닫힘 꺼짐 바로가기 호환 AGS2-L09 기본 모드 제한 최신' },
  { q: '내 진도가 사라졌어요.', a: '브라우저 데이터가 지워졌거나 다른 브라우저/기기에서 열었을 수 있어요. 진도는 기기마다 따로 저장됩니다. 미리 백업해 두었다면 설정에서 복원하세요.', keywords: '진도 사라짐 복원 백업' },
  { q: '음성이 사람 목소리가 아니에요.', a: '기기 음성은 스마트폰의 음성 합성을 사용합니다. 녹음 음성은 Microsoft Edge Neural 음성으로 만들었습니다. 설정에서 재생 방식과 중국어 기기 음성을 선택할 수 있어요.', keywords: '음성 목소리 ai 합성 xiaoxiao 기기 녹음' },
  { q: '내용이 틀린 것 같아요.', a: '학습 콘텐츠는 AI의 도움으로 제작한 뒤 직접 검수·편집했습니다. 오류를 발견하면 앱 정보 화면의 연락처로 알려 주세요.', keywords: '오류 틀림 신고 문의 ai 콘텐츠' },
  { q: '레벨은 어떻게 나뉘나요?', a: '총 8권(160과)을 2권씩 묶어 4개 레벨로 나눴습니다. 설정에서 내 레벨을 바꾸면 홈의 진도 기준이 바뀝니다.', keywords: '레벨 권 vol 과 160' },
];

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const guides = GUIDES.filter((g) => !q || `${g.title} ${g.subtitle} ${g.keywords}`.toLowerCase().includes(q));
  const faqs = FAQ.filter((f) => !q || `${f.q} ${f.a} ${f.keywords ?? ''}`.toLowerCase().includes(q));
  const none = searching && guides.length === 0 && faqs.length === 0;

  return (
    <main className="p-4 space-y-5">
      <header>
        <h1 className="text-xl font-bold inline-flex items-center gap-2"><Icon name="help" size={22} /> 도움말</h1>
        <p className="text-sm text-slate-500 mt-1">처음 사용하시거나 막힐 때 여기를 보세요.</p>
        <p className="text-xs text-slate-500 mt-1">앱 버전: <b>v{__APP_VERSION__}</b></p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <label htmlFor="help-search" className="sr-only">도움말 검색</label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-brand">
          <Icon name="search" size={18} className="text-slate-400 flex-none" />
          <input id="help-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off"
            placeholder="도움말 찾기 (예: 음성, 설치, 백업…)" className="flex-1 bg-transparent outline-none text-base" />
          {query && (
            <button type="button" aria-label="검색어 지우기" onClick={() => setQuery('')} className="rounded-full p-1 text-slate-400">
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {guides.map((g) => (
          <Accordion key={g.id} title={g.title} subtitle={g.subtitle} icon={g.icon}
            open={searching || openId === g.id} onToggle={() => setOpenId((c) => (c === g.id ? null : g.id))}>
            {g.body}
          </Accordion>
        ))}
        {faqs.length > 0 && (
          <Accordion title="자주 묻는 질문" subtitle={searching ? `검색 결과 ${faqs.length}건` : '많이들 물어보시는 질문을 모았어요.'} icon="help"
            open={searching || openId === 'faq'} onToggle={() => setOpenId((c) => (c === 'faq' ? null : 'faq'))}>
            <dl className="space-y-3">
              {faqs.map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold">Q. {f.q}</dt>
                  <dd className="text-slate-600 mt-0.5">{f.a}</dd>
                </div>
              ))}
            </dl>
          </Accordion>
        )}
        {none && <p className="text-sm text-slate-500 text-center py-6">"{query.trim()}"에 대한 도움말이 없어요. 다른 단어로 찾아보세요.</p>}
      </div>
    </main>
  );
}
