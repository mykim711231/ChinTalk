import { Link, useParams } from 'react-router-dom';

export function BasicModeNotice() {
  return (
    <aside aria-label="기본 학습 모드 안내" className="mx-4 mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm space-y-1">
      <p className="font-bold">기본 학습 모드</p>
      <p>교재와 듣기를 제공해요. 10분 데일리·마스터리·마이크 녹음은 제한돼요.</p>
      <p className="text-xs text-slate-600">전체 기능은 지원 중인 Android와 최신 Chrome에서 이용하세요. <Link to="/help" className="text-brand underline">도움말</Link></p>
    </aside>
  );
}

/** 메뉴를 거치지 않은 예전 즐겨찾기·직접 주소도 고급 학습을 실행하지 않는다. */
export function BasicModeUnavailable({ feature }: { feature: string }) {
  const { id } = useParams();
  return (
    <main className="p-4 space-y-3">
      <h1 className="text-xl font-bold">{feature} 이용 안내</h1>
      <p className="text-sm">기본 학습 모드에서 제한되는 기능이에요. 본문·회화와 문장별·전체 듣기로 학습해 주세요.</p>
      <div className="flex flex-wrap gap-3 text-brand font-semibold underline">
        <Link to={id ? `/lesson/${id}` : '/path'}>교재 학습하기</Link>
        <Link to="/passive">편하게 듣기</Link>
        <Link to="/settings">사용 모드 확인</Link>
      </div>
    </main>
  );
}
