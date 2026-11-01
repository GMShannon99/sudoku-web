// Hard Level (numbers 1-99, any shared total) logic tests.
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../magic-square-logic.js");

const hardSq = (c, a, b) => {
  const v = [c + a, c - a - b, c + b, c - a + b, c, c + a - b, c - b, c + a + b, c - a];
  return [v.slice(0, 3), v.slice(3, 6), v.slice(6)];
};

test("hard isValue: whole numbers 1-99; rejects 0, 00, 100, text; easy unchanged", () => {
  for (const ok of ["1", "9", "10", "42", "99", 7]) assert.equal(M.isValue(ok, "hard"), true);
  for (const bad of ["0", "00", "05", "100", "a", "", " ", "-3", "1.5", "123"]) assert.equal(M.isValue(bad, "hard"), false);
  assert.equal(M.isValue("10", "easy"), false);
  assert.equal(M.isValue("9", "easy"), true);
  assert.equal(M.isValue("5"), true);
});

test("hard isMagic: any common total, nine distinct numbers in 1-99", () => {
  assert.equal(M.isMagic(hardSq(50, 7, 20), "hard"), true);
  assert.equal(M.isMagic(M.SQUARES[0], "hard"), true); // an easy square is also a valid hard one
  const dup = hardSq(50, 7, 20);
  dup[0][0] = dup[0][1];
  assert.equal(M.isMagic(dup, "hard"), false);
  const off = hardSq(50, 7, 20);
  [off[0][0], off[2][2]] = [off[2][2], off[0][0]];
  assert.equal(M.isMagic(off, "hard"), false); // totals disagree
  assert.equal(M.isMagic(hardSq(1, 0, 0), "hard"), false); // all equal
  assert.equal(M.isMagic(hardSq(98, 5, 7), "hard"), false); // 103 is out of range
  assert.equal(M.isMagic(M.emptyGrid(), "hard"), false);
  assert.equal(M.isMagic(hardSq(50, 7, 20)), false); // a hard-only square is not an easy square
});

test("hard enumeration finds exactly the squares of the (c, a, b) form", () => {
  const g = M.emptyGrid();
  g[1][1] = 50;
  g[0][0] = 57;
  g[0][2] = 70;
  const all = M.hardMatching(g);
  assert.equal(all.length, 1);
  assert.deepEqual(all[0], hardSq(50, 7, 20));
  for (const sq of M.hardMatching(M.emptyGrid(), 500)) assert.equal(M.isMagic(sq, "hard"), true);
});

test("hard enumeration includes every easy square", () => {
  for (const sq of M.SQUARES) {
    assert.ok(M.hardMatching(sq).some((x) => JSON.stringify(x) === JSON.stringify(sq)));
  }
});

test("hard duplicate detection works on 1-99 numbers anywhere in the grid", () => {
  const g = M.emptyGrid();
  g[0][0] = 42;
  assert.equal(M.hasDuplicate(g, 2, 1, 42), true);
  assert.equal(M.hasDuplicate(g, 2, 1, "42"), true);
  assert.equal(M.hasDuplicate(g, 2, 1, 24), false);
  assert.equal(M.hasDuplicate(g, 0, 0, 42), false);
});

test("hard canComplete: possible entries yes, impossible entries no", () => {
  assert.equal(M.canComplete(M.emptyGrid(), "hard"), true);
  const one = M.emptyGrid();
  one[0][0] = 60;
  assert.equal(M.canComplete(one, "hard"), true);
  const cornerMax = M.emptyGrid();
  cornerMax[0][0] = 99; // forces b = 0, which repeats the centre
  assert.equal(M.canComplete(cornerMax, "hard"), false);
  const centre = M.emptyGrid();
  centre[1][1] = 1; // the other eight can't all fit around 1
  assert.equal(M.canComplete(centre, "hard"), false);
  const mismatch = M.emptyGrid();
  mismatch[0][0] = 10;
  mismatch[0][1] = 20;
  mismatch[0][2] = 30;
  mismatch[1][1] = 40; // row total 60 but the centre needs 120
  assert.equal(M.canComplete(mismatch, "hard"), false);
  const good = M.emptyGrid();
  good[0][0] = 57;
  good[1][1] = 50;
  good[0][2] = 70;
  assert.equal(M.canComplete(good, "hard"), true);
  const clash = M.emptyGrid();
  clash[0][0] = 30;
  clash[0][2] = 32;
  clash[0][1] = 31;
  clash[1][1] = 31; // forces a repeated 31
  assert.equal(M.canComplete(clash, "hard"), false);
});

test("hard generatePuzzle: valid square, few givens, exactly one solution, over many runs", () => {
  const counts = {};
  const totals = new Set();
  for (let i = 0; i < 150; i++) {
    const { puzzle, solution } = M.generatePuzzle(Math.random, "hard");
    assert.equal(M.isMagic(solution, "hard"), true);
    const n = M.countFilled(puzzle);
    counts[n] = (counts[n] || 0) + 1;
    assert.ok(n >= 3 && n <= 5, `got ${n} givens`);
    puzzle.forEach((row, r) => row.forEach((v, c) => v && assert.equal(v, solution[r][c])));
    const found = M.hardMatching(puzzle);
    assert.equal(found.length, 1);
    assert.deepEqual(found[0], solution);
    totals.add(solution[0][0] + solution[0][1] + solution[0][2]);
  }
  assert.ok(totals.size > 20, "totals should vary widely");
  console.log("hard givens used:", JSON.stringify(counts));
});

test("hard generatePuzzle terminates for adversarial randomness", () => {
  let n = 0;
  const rng = () => ((n = (n * 7 + 3) % 10) + 0.5) / 10;
  const { puzzle } = M.generatePuzzle(rng, "hard");
  assert.equal(M.hardMatching(puzzle, 2).length, 1);
});

test("hard solution prefers the first completion matching the player's entries", () => {
  const givens = M.emptyGrid();
  givens[1][1] = 50;
  const target = hardSq(50, 7, 20);
  const entries = givens.map((r) => r.slice());
  entries[0][0] = target[0][0];
  entries[0][2] = target[0][2];
  assert.deepEqual(M.solution(givens, entries, "hard"), target);
  const first = M.solution(givens, null, "hard");
  assert.equal(M.isMagic(first, "hard"), true);
  assert.equal(first[1][1], 50);
  const stray = givens.map((r) => r.slice());
  stray[0][0] = 99;
  stray[0][1] = 99; // matches no square, so it falls back to the givens' first completion
  assert.deepEqual(M.solution(givens, stray, "hard"), first);
  const impossible = M.emptyGrid();
  impossible[1][1] = 1;
  assert.equal(M.solution(impossible, null, "hard"), null);
});
