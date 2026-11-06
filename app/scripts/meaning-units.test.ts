import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { Jieba } from '@node-rs/jieba';
import { dict } from '@node-rs/jieba/dict';
import { meaningUnitEnds } from './meaning-units';
import { reviewedMeaningUnits } from './meaning-overrides';
import type { Lesson } from '../src/types/lesson';

const jieba = Jieba.withDict(dict);
const parts = (text: string, ends: number[]) => ends.map((end, i) => [...text].slice(i ? ends[i - 1] : 0, end).join(''));
const split = (text: string) => parts(text, meaningUnitEnds(text, jieba.tag(text)));

test('subject + copula stays together, including a previously unseen name', () => {
  assert.deepEqual(split('我是韩国人。'), ['我是', '韩国人。']);
  assert.deepEqual(split('他是中国人。'), ['他是', '中国人。']);
  assert.deepEqual(split('你叫王平。'), ['你叫', '王平。']);
});

test('possession, quantities, negation and complements remain meaningful units', () => {
  const groups = split('他的两本书已经看完了。');
  assert.ok(groups.some((g) => g.includes('他的两本书')));
  assert.ok(groups.some((g) => g.includes('已经看完了')));
  assert.deepEqual(split('您的行李超重了。'), ['您的行李', '超重了。']);
  assert.deepEqual(split('请托运这件行李。'), ['请托运', '这件行李。']);
  assert.deepEqual(split('我也很好。'), ['我也很好。']);
});

test('source-specified boundaries take priority over automatic and reviewed choices', () => {
  assert.deepEqual(parts('我是韩国人。', meaningUnitEnds('我是韩国人。', jieba.tag('我是韩国人。'), '我／是韩国人。')), ['我', '是韩国人。']);
  assert.throws(() => meaningUnitEnds('我是韩国人。', [], '我是／中国人。'));
});

test('email addresses, ASCII identifiers and calendar dates are never split internally', () => {
  const text = '我的邮箱是wang@mail.com，房间号是B12，八月三十一号之前联系我。';
  const ends = meaningUnitEnds(text, jieba.tag(text));
  for (const expression of ['wang@mail.com', 'B12', '八月三十一号之前']) {
    const start = [...text.slice(0, text.indexOf(expression))].length;
    assert.ok(!ends.some((end) => end > start && end < start + [...expression].length), expression);
  }
  assert.equal(parts(text, ends).join(''), text);
});

test('every reviewed sentence reconstructs the original exactly', () => {
  for (const marked of reviewedMeaningUnits) {
    const text = marked.replace(/／/g, '');
    assert.deepEqual(split(text), marked.split('／'));
  }
});

test('all generated body and dialogue boundaries are ordered, complete and punctuation-safe', () => {
  let count = 0;
  for (let vol = 1; vol <= 8; vol++) {
    const lessons: Lesson[] = JSON.parse(readFileSync(new URL(`../public/data/lessons-vol${vol}.json`, import.meta.url), 'utf8'));
    for (const lesson of lessons) for (const verse of [...lesson.text, ...lesson.dialogs.flatMap((d) => d.turns.map((t) => t.verse))]) {
      const ends = verse.phrases!;
      assert.ok(ends.every((end, i) => Number.isInteger(end) && end > (i ? ends[i - 1] : 0)), verse.zh);
      assert.equal(ends[ends.length - 1], [...verse.zh].length, verse.zh);
      const groups = parts(verse.zh, ends);
      assert.equal(groups.join(''), verse.zh);
      assert.ok(groups.every((g, i) => !i || !/^[，。！？；、]/.test(g)), verse.zh);
      // 쉼표·문장부호 양쪽을 하나로 묶던 이전 오류를 방지한다.
      assert.ok(groups.every((g) => !/[，。！？；][”’）)」』]*[一-鿿]/.test(g)), verse.zh);
      count++;
    }
  }
  assert.equal(count, 2914);
});
