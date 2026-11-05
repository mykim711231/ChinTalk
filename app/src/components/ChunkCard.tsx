import { speak } from '../lib/tts';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useHighlightStore, type Color } from '../stores/useHighlightStore';
import type { Verse } from '../types/lesson';
import Icon from './Icon';
import HanText from './HanText';
import { alignChars } from '../lib/pinyin';

const BG: Record<Color, string> = { green: 'bg-green-50', yellow: 'bg-yellow-50', red: 'bg-red-50' };
const DOT: Record<Color, string> = { green: 'bg-green-600', yellow: 'bg-yellow-500', red: 'bg-red-600' };
const LABEL: Record<Color, string> = { green: '바로 이해', yellow: '헷갈림', red: '완전 생소' };

export default function ChunkCard({ verse, speaker }: { verse: Verse; speaker?: string }) {
  const { showZh, showPinyin, showKo, breakLevel } = useSettingsStore();
  const { marks, cycle } = useHighlightStore();
  const key = verse.chunks[0]?.id ?? verse.zh;
  const aligned = !!alignChars(verse.zh, verse.pinyin);
  const color = marks[key];
  return (
    <div className={`rounded-xl border border-slate-200 p-3 mb-2 ${color ? BG[color] : 'bg-white'}`}>
      <div className="flex items-start gap-2">
        <button
          aria-label="듣기"
          onClick={() => speak(verse.zh)}
          className="shrink-0 w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center"
        >
          <Icon name="speaker" size={18} />
        </button>
        <div className="flex-1 min-w-0">
          {speaker && <span className="text-xs text-slate-500 mr-1">{speaker}</span>}
          {showZh && (
            <div className={`text-xl ${showPinyin && aligned ? 'leading-[2.3]' : 'leading-snug'}`}>
              <HanText zh={verse.zh} pinyin={verse.pinyin} ruby={showPinyin} words={verse.words} phrases={verse.phrases} breakLevel={breakLevel} />
            </div>
          )}
          {showPinyin && (!showZh || !aligned) && <div className="text-sm text-slate-600">{verse.pinyin}</div>}
          {showKo && <div className="text-sm text-slate-800">{verse.ko}</div>}
        </div>
        <button
          aria-label={color ? `형광펜: ${LABEL[color]}` : '형광펜 표시'}
          onClick={() => cycle(key)}
          className="shrink-0 w-9 h-9 flex items-center justify-center"
        >
          <span
            className={`block w-4 h-4 rounded-full ${color ? DOT[color] : 'border-2 border-slate-300'}`}
          />
        </button>
      </div>
    </div>
  );
}
