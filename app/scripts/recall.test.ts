import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextCard, type ReviewCard } from '../src/lib/srs';
import { recallOrder, BATCH, currentCard, gradeCard, masteryScore, recallAccuracy, remainingCards, shadowCount, startRecall } from '../src/lib/recall';
import { buildQuiz } from '../src/lib/quiz';
import type { StudyLine } from '../src/lib/studyContent';

const line = (n: number): StudyLine => ({ source: 'text', verse: { zh: `句${n}`, pinyin: `p${n}`, ko: `뜻${n}`, chunks: [] } });

test('복습: 맞히면 졸업, 틀리면 그대로 남는다(날짜 제한 없음)', () => {
  const card: ReviewCard = { lessonId: 'v1-01', zh: '句' };
  assert.equal(nextCard(card, true), null);
  assert.deepEqual(nextCard(card, false), card);
});

test('떠올리기: 첫 시도 못함은 더미로, 더미가 빌 때까지 반복', () => {
  let s = startRecall([0, 1, 2]);
  assert.equal(currentCard(s), 0);
  assert.equal(shadowCount(s), 1);
  s = gradeCard(s, true);   // 0 맞음
  s = gradeCard(s, false);  // 1 못함 → 더미
  s = gradeCard(s, true);   // 2 맞음
  assert.equal(s.inPile, true);
  assert.equal(currentCard(s), 1);
  assert.equal(shadowCount(s), 2);
  s = gradeCard(s, false);  // 더미에서 못함 → 남음
  assert.equal(currentCard(s), 1);
  assert.deepEqual(recallAccuracy(s), { correct: 2, total: 3 });
  s = gradeCard(s, true);   // 더미에서 맞음 → 제외
  assert.equal(currentCard(s), null);
  // 추가 학습 성공은 첫 시도 정답률에 더하지 않는다
  assert.deepEqual(recallAccuracy(s), { correct: 2, total: 3 });
});

test('떠올리기: 5장씩 묶음 처리와 이어 하기 목록', () => {
  const n = BATCH + 2;
  let s = startRecall(Array.from({ length: n }, (_, i) => i));
  assert.equal(s.batch.length, BATCH);
  assert.equal(remainingCards(s).length, n);
  for (let i = 0; i < BATCH; i++) s = gradeCard(s, true);
  assert.equal(s.batch.length, 2);
  assert.equal(currentCard(s), BATCH);
  s = gradeCard(s, false);
  assert.deepEqual(new Set(remainingCards(s)), new Set([BATCH, BATCH + 1]));
});

test('점수: 퀴즈 50% + 떠올리기 첫 시도 50%', () => {
  assert.equal(masteryScore(1, 1), 100);
  assert.equal(masteryScore(0.8, 0.6), 70);
  assert.equal(masteryScore(null, 0.9), 90);
});

test('퀴즈: 정답이 보기에 있고 보기는 서로 다르다', () => {
  const lines = Array.from({ length: 8 }, (_, i) => line(i));
  const quiz = buildQuiz(lines);
  assert.ok(quiz.length > 0 && quiz.length <= 10);
  for (const q of quiz) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.equal(q.options[q.answer], lines[q.index].verse.ko);
  }
  assert.deepEqual(buildQuiz([line(1)]), []);
});

test('떠올리기 순서: 본문은 무작위, 회화는 순서 유지', () => {
  const t = (n: number) => ({ ...line(n), source: 'text' as const });
  const d = (n: number) => ({ ...line(n), source: 'dialog' as const });
  const out = recallOrder([t(1), t(2), t(3), t(4), d(5), d(6), d(7)]);
  assert.deepEqual(out.slice(4).map((l) => l.verse.zh), ['句5', '句6', '句7']);
  assert.deepEqual(new Set(out.slice(0, 4).map((l) => l.verse.zh)), new Set(['句1', '句2', '句3', '句4']));
});

test('퀴즈: 간체 고르기는 정답이 같은 문장의 간체', () => {
  const lines = Array.from({ length: 6 }, (_, i) => line(i));
  const q = buildQuiz(lines, 10, 'zh');
  assert.ok(q.length > 0);
  for (const x of q) assert.equal(x.options[x.answer], lines[x.index].verse.zh);
});
