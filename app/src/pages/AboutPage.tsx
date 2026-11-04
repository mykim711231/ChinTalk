import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <main className="p-4 text-sm leading-relaxed">
      <Link to="/settings" className="text-slate-500">
        ← 설정
      </Link>
      <h1 className="text-xl font-bold my-2">콘텐츠 출처 및 이용 안내</h1>
      <p>
        본 앱의 중국어 회화·어휘·병음·문법 설명은 AI(DeepSeek)의 도움을 받아 제작한 뒤 직접 검수·편집했습니다.
        학습 목적의 무료 앱입니다. 앱 코드는 MIT 라이선스입니다.
      </p>
      <p className="mt-2">
        음성은 현재 기기 TTS를 사용하며, 추후 Microsoft Edge 읽어주기 음성(비공식 경로)으로 사전 합성한 mp3로 교체할
        예정입니다.
      </p>
      <p className="mt-2">
        <b>단어장 사전(word-dict.json)</b>: 추가 시 CC-CEDICT(CC BY-SA 4.0)를 바탕으로 한국어 뜻풀이를 재작성하며, 해당
        파일만 CC BY-SA 4.0으로 공개합니다(수정됨).
      </p>
      <h2 className="font-semibold mt-4">개인정보</h2>
      <p>본 앱은 어떠한 사용자 정보도 외부로 전송하지 않습니다. 모든 학습 기록은 이 기기에만 저장됩니다.</p>
    </main>
  );
}
