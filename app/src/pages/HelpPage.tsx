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
    keywords: '학습 방법 본문 단어 문법 회화 발음 함정 레벨 과 구조 청크 형광펜',
    body: (
      <>
        <Box>
          <p>ChinTalk는 <b>눈이 아니라 귀로 먼저</b> 익히는 구조화 듣기 앱입니다. 문장을 의미 단위(청크)로 나눠 들려주고, 한자·병음·한글을 켜고 끌 수 있어요.</p>
        </Box>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><b>본문</b> — 스피커 버튼으로 문장을 듣고, 한자·병음·한글 칩으로 보이는 정보를 조절합니다.</li>
          <li><b>단어 · 문법 · 회화</b> — 본문에 나온 어휘, 핵심 문형, 대화문입니다.</li>
          <li><b>발음 함정</b> — 한국인이 자주 틀리는 발음을 짚어 줍니다.</li>
          <li>마지막에 <b>"이 과 완료로 표시"</b>를 누르면 진도에 반영됩니다.</li>
        </ul>
        <Tip>듣기 → 가리고 따라 말하기 → 확인 순서로 반복하면 효과가 큽니다. 처음엔 병음과 한글을 켜고, 익숙해지면 끄세요.</Tip>
      </>
    ),
  },
  {
    id: 'highlight', icon: 'check-circle', title: '형광펜(이해도 표시) 사용법',
    subtitle: '카드 오른쪽 동그라미를 눌러 이해도를 표시해요.',
    keywords: '형광펜 이해도 표시 초록 노랑 빨강 북마크 동그라미 색',
    body: (
      <>
        <p>문장 카드 오른쪽 끝의 동그라미를 누를 때마다 색이 바뀝니다.</p>
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
          <li><b>설정 → 한글 음성</b>을 켜면 10분 데일리·편하게 듣기·마스터리에서 중국어 다음에 한글 번역을 읽어 줘요.</li>
          <li>기본값은 <L to="/settings">설정 → 화면</L>에서도 바꿀 수 있어요.</li>
          <li><b>글자 크기</b>는 보통 / 크게 / 아주 크게 3단계, <b>청색광 차단</b>은 4단계입니다.</li>
        </ol>
        <Tip>한자만 보고 외우려면 병음·한글을 끄고, 듣기만 연습하려면 셋 다 끄고 소리에 집중해 보세요.</Tip>
      </>
    ),
  },
  {
    id: 'audio', icon: 'speaker', title: '음성이 안 들려요',
    subtitle: '미리 합성된 mp3 재생 · 단말기 음성 대체 안내.',
    keywords: '음성 소리 안 들려요 tts mp3 무음 볼륨 음성팩 속도 느리게 무음모드 ios 아이폰',
    body: (
      <>
        <Box>
          <p>본문·단어·회화의 중국어는 <b>미리 합성된 mp3</b>로 재생됩니다. 단말기에 중국어 음성팩이 없어도 들려요. mp3가 없는 문장만 단말기 중국어 음성으로 대신합니다.</p>
        </Box>
        <AudioTest />
        <p className="font-bold pt-1">확인 순서</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>기기 볼륨과 <b>무음(진동) 모드</b>를 확인하세요. {isIOS() && '아이폰은 무음 스위치가 켜져 있으면 소리가 나지 않을 수 있어요.'}</li>
          <li>카카오톡·네이버 등 <b>앱 안에서 연 화면</b>이면 음성이 제한됩니다. Chrome/Safari에서 열어 주세요.</li>
          <li>처음 한 번은 인터넷이 필요합니다. 한 번 재생한 mp3는 기기에 저장되어 오프라인에서도 들려요.</li>
          <li>그래도 안 되면 <L to="/settings">설정 → 저장 공간</L>에서 캐시를 비운 뒤 다시 시도하세요.</li>
        </ol>
        <p>너무 빠르게 들리면 <L to="/settings">설정 → 음성</L>에서 <b>속도</b>를 0.80× 정도로 낮춰 보세요.</p>
      </>
    ),
  },
  {
    id: 'install', icon: 'download', title: '앱으로 설치하기',
    subtitle: '홈 화면에 추가하면 인터넷 없이도 쓸 수 있어요.',
    keywords: '설치 홈 화면 추가 pwa iphone android windows mac safari chrome edge 오프라인',
    body: (
      <ul className="space-y-2">
        <li><b>Android (Chrome)</b> — 메뉴(⋮) → <b>홈 화면에 추가</b> 또는 <b>앱 설치</b></li>
        <li><b>iPhone / iPad (Safari)</b> — 공유(↑) → <b>홈 화면에 추가</b></li>
        <li><b>PC (Chrome·Edge)</b> — 주소창 오른쪽의 <b>설치(⊕)</b> 아이콘</li>
        <li className="text-xs text-slate-500">카카오톡 등 인앱 브라우저에서는 설치가 안 됩니다. 주소를 복사해 Chrome/Safari에서 여세요.</li>
      </ul>
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
        <li><b>업데이트</b> — 앱이 새 버전을 자동으로 받아 둡니다. 앱을 완전히 종료했다가 다시 열면 적용돼요.</li>
        <li><b>캐시만 정리</b> — 설정 → 저장 공간 → <b>음성·본문 캐시 비우기</b> (진도는 유지)</li>
        <li><b>완전 삭제</b> — 홈 화면 아이콘을 길게 눌러 삭제. 진도까지 지우려면 설정의 <b>전체 초기화</b>를 먼저 하세요.</li>
      </ul>
    ),
  },
];

const FAQ: { q: string; a: string; keywords?: string }[] = [
  { q: '무료인가요?', a: '네, 학습용 무료 앱입니다. 광고도 회원가입도 없어요.', keywords: '무료 가격 광고 회원' },
  { q: '인터넷 없이도 되나요?', a: '설치한 뒤 한 번 열어 본 과와 한 번 재생한 음성은 오프라인에서도 사용할 수 있어요. 처음 여는 과와 음성은 인터넷이 필요합니다.', keywords: '오프라인 인터넷 데이터' },
  { q: '내 진도가 사라졌어요.', a: '브라우저 데이터가 지워졌거나 다른 브라우저/기기에서 열었을 수 있어요. 진도는 기기마다 따로 저장됩니다. 미리 백업해 두었다면 설정에서 복원하세요.', keywords: '진도 사라짐 복원 백업' },
  { q: '음성이 사람 목소리가 아니에요.', a: '본문 음성은 AI 음성 합성(Microsoft Edge Neural, Xiaoxiao)으로 만들었습니다. 정확한 성조와 일정한 속도로 반복 듣기에 적합해요.', keywords: '음성 목소리 ai 합성 xiaoxiao' },
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
