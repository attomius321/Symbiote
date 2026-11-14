import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, format, clock } from '../src/index.js';

test('parse reads each unit', () => {
  assert.equal(parse('2h'), 7_200_000);
  assert.equal(parse('30m'), 1_800_000);
  assert.equal(parse('90s'), 90_000);
  assert.equal(parse('250ms'), 250);
});

test('parse adds units together', () => {
  assert.equal(parse('1h30m'), 5_400_000);
  assert.equal(parse('1m30s500ms'), 90_500);
});

test('format gives whole units, largest first', () => {
  assert.equal(format(5_400_000), '1h 30m');
  assert.equal(format(90_000), '1m 30s');
  assert.equal(format(0), '0s');
});

test('format refuses a negative span', () => {
  assert.throws(() => format(-1), RangeError);
});

test('clock pads the minutes', () => {
  assert.equal(clock(3_735_000), '1:02:15');
});
