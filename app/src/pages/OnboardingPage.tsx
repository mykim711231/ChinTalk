import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LEVEL_NAMES } from '../lib/contentLoader';
import { useSettingsStore } from '../stores/useSettingsStore';
import Icon from '../components/Icon';

const LEVEL_DESC: Record<number, string> = {
  1: '인사·숫자·일상 표현부터, 소리에 익숙해지는 단계',
  2: '여행·쇼핑·비즈니스 등 상황별 회화',
  3: '빠른 속도와 연음, 원어민의 리듬',
  4: '의견 말하기·시사·논증까지 자유롭게',
};

/** S-002 온보딩: 소리→의미 안내 · 레벨 선택 · 마이크 안내 (첫 진입 1회, 설정에서 다시 보기) */
export default function OnboardingPage() {
  const [i, setI] = useState(0);
  const { level, setLevel, setOnboarded } = useSettingsStore();
  const nav = useNavigate();
  const finish = () => { setOnboarded(true); nav('/', { replace: true }); };

  return (
    <main className="min-h-screen p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" aria-label={`${i + 1}/3`}>
          {[0, 1, 2].map((n) => <span key={n} className={`h-1.5 w-8 rounded-full ${n <= i ? 'bg-brand' : 'bg-slate-200'}`} />)}
        </div>
        <button type="button" onClick={finish} className="text-sm text-slate-500 px-2 py-1">건너뛰기</button>
      </div>

      <div className="flex-1 py-8">
        {i === 0 && (
          <section className="space-y-4">
            <Icon name="headphones" size={44} className="text-brand" />
            <h1 className="text-3xl font-extrabold leading-tight">눈이 아니라<br />귀로 배웁니다</h1>
            <p className="text-slate-700">한글 발음 표기에 기대지 않고, <b>소리에서 곧바로 뜻</b>이 떠오르도록 의미 단위로 쪼개 들어요.</p>
            <ul className="space-y-2 text-sm">
              {['한글로 읽어 외우는 습관에서 벗어나요', '성조가 무너지지 않게 원어민 소리를 그대로 들어요', '하루 10분, 3일 포기 없이 이어 가요'].map((t) => (
                <li key={t} className="flex gap-2"><Icon name="check-circle" size={18} className="text-brand flex-none mt-0.5" />{t}</li>
              ))}
            </ul>
          </section>
        )}
        {i === 1 && (
          <section className="space-y-4">
            <h1 className="text-2xl font-extrabold">내 레벨을 골라 주세요</h1>
            <p className="text-sm text-slate-600">첫 추천 과의 기준이에요. 설정에서 언제든 바꿀 수 있어요.</p>
            <div role="radiogroup" aria-label="레벨" className="space-y-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n} type="button" role="radio" aria-checked={level === n}
                  onClick={() => setLevel(n as 1 | 2 | 3 | 4)}
                  className={`w-full text-left rounded-2xl border p-3 ${level === n ? 'border-brand bg-brand-50' : 'border-slate-200 bg-white'}`}
                >
                  <div className="font-bold">{LEVEL_NAMES[n]}</div>
                  <div className="text-xs text-slate-500">{LEVEL_DESC[n]}</div>
                </button>
              ))}
            </div>
          </section>
        )}
        {i === 2 && (
          <section className="space-y-4">
            <Icon name="mic" size={44} className="text-brand" />
            <h1 className="text-2xl font-extrabold">따라 말하기에 마이크를 써요</h1>
            <p className="text-slate-700">쉐도잉 단계에서 내 발음을 녹음해 원어민 소리와 번갈아 들어 볼 수 있어요.</p>
            <p className="text-sm text-slate-600">권한 요청은 <b>쉐도잉을 처음 시작할 때</b>만 나타나요. 허용하지 않아도 학습은 그대로 할 수 있어요(소리를 들으며 입모양 따라 하기).</p>
            <p className="text-xs text-slate-500">녹음은 이 기기 안에서만 쓰이고 어디로도 전송되지 않습니다.</p>
          </section>
        )}
      </div>

      <div className="flex gap-2">
        {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="rounded-full border border-slate-300 bg-white font-semibold px-5 py-3">이전</button>}
        <button type="button" onClick={() => (i < 2 ? setI(i + 1) : finish())} className="flex-1 rounded-full bg-brand text-white font-semibold py-3">
          {i < 2 ? '다음' : '시작하기'}
        </button>
      </div>
    </main>
  );
}
