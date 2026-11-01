// Hard Level (whole numbers 1-20, any shared total) logic tests.
//
// Which entries are possible is never hardcoded here: ALL is an independent
// brute-force enumeration (first row + centre, everything else derived from
// the line sums), and expectations are computed from it.
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../magic-square-logic.js");

const MAX = 20;

function bruteForceAll() {
  const out = [];
  for (let x = 1; x <= MAX; x++)
    for (let y = 1; y <= MAX; y++)
      for (let z = 1; z <= MAX; z++) {
        if (x === y || y === z || x === z) continue;
        const S = x + y + z;
        for (let m = 1; m <= MAX; m++) {
          const br = S - x - m;
          const bl = S - z - m;
          const ml = S - x - bl;
          const mr = S - z - br;
          const bm = S - bl - br;
          const v = [x, y, z, ml, m, mr, bl, bm, br];
          if (!v.every((n) => n >= 1 && n <= MAX) || new Set(v).size !== 9) continue;
          if (y + m + bm !== S || ml + m + mr !== S || bl + bm + br !== S) continue;
          out.push([v.slice(0, 3), v.slice(3, 6), v.slice(6)]);
        }
      }
  return out;
}
const ALL = bruteForceAll();
const key = (g) => g.flat().join(",");
const fits = (sq, grid) => sq.every((row, r) => row.every((v, c) => grid[r][c] === 0 || grid[r][c] === v));
const possible = (grid) => ALL.filter((sq) => fits(sq, grid));

const hardSq = (c, a, b) => {
  const v = [c + a, c - a - b, c + b, c - a + b, c, c + a - b, c - b, c + a + b, c - a];
  return [v.slice(0, 3), v.slice(3, 6), v.slice(6)];
};

test("the (c, a, b) enumeration matches an independent brute force exactly", () => {
  assert.ok(ALL.length > 100, "sanity: " + ALL.length);
  const mine = M.hardMatching(M.emptyGrid());
  assert.equal(mine.length, ALL.length);
  assert.deepEqual(mine.map(key).sort(), ALL.map(key).sort());
  console.log("valid hard squares in 1-" + MAX + ":", ALL.length);
});

test("entryError / isValue: whole numbers 1-20; 21+ is a range error; 0, 00, leading zeros, text are not numbers", () => {
  for (const ok of ["1", "9", "10", "15", "20", 7]) {
    assert.equal(M.isValue(ok, "hard"), true, String(ok));
    assert.equal(M.entryError(ok, "hard"), null);
  }
  for (const over of ["21", "30", "99", "100", "123"]) {
    assert.equal(M.entryError(over, "hard"), "range", over);
    assert.equal(M.isValue(over, "hard"), false);
  }
  for (const bad of ["0", "00", "05", "01", "a", "", " ", "-3", "1.5", "2a", "x1"]) {
    assert.equal(M.entryError(bad, "hard"), "nonnumeric", JSON.stringify(bad));
    assert.equal(M.isValue(bad, "hard"), false);
  }
  // easy is unchanged: a single digit 1-9
  assert.equal(M.isValue("10", "easy"), false);
  assert.equal(M.entryError("10", "easy"), "nonnumeric");
  assert.equal(M.isValue("9", "easy"), true);
  assert.equal(M.isValue("5"), true);
});

test("hard isMagic: any common total, nine distinct numbers in 1-20", () => {
  assert.equal(M.isMagic(hardSq(10, 2, 5), "hard"), true);
  assert.equal(M.isMagic(M.SQUARES[0], "hard"), true); // an easy square is also a valid hard one
  for (const sq of ALL.slice(0, 200)) assert.equal(M.isMagic(sq, "hard"), true);
  const dup = hardSq(10, 2, 5);
  dup[0][0] = dup[0][1];
  assert.equal(M.isMagic(dup, "hard"), false);
  const off = hardSq(10, 2, 5);
  [off[0][0], off[2][2]] = [off[2][2], off[0][0]];
  assert.equal(M.isMagic(off, "hard"), false); // totals disagree
  assert.equal(M.isMagic(hardSq(1, 0, 0), "hard"), false); // all equal
  assert.equal(M.isMagic(hardSq(50, 7, 20), "hard"), false); // a valid magic square, but over 20
  assert.equal(M.isMagic(hardSq(18, 5, 7), "hard"), false); // 23 is out of range
  assert.equal(M.isMagic(M.emptyGrid(), "hard"), false);
  assert.equal(M.isMagic(hardSq(10, 2, 5)), false); // a hard-only square is not an easy square
});

test("hard enumeration returns exactly the squares fitting the entries", () => {
  const g = M.emptyGrid();
  g[1][1] = 10;
  g[0][0] = 12;
  g[0][2] = 15;
  const found = M.hardMatching(g);
  assert.deepEqual(found.map(key).sort(), possible(g).map(key).sort());
  assert.deepEqual(found, [hardSq(10, 2, 5)]);
  assert.equal(M.hardMatching(M.emptyGrid(), 5).length, 5); // limit respected
});

test("hard enumeration includes every easy square", () => {
  for (const sq of M.SQUARES) assert.ok(M.hardMatching(sq).some((x) => key(x) === key(sq)));
});

test("hard duplicate detection works on 1-20 numbers anywhere in the grid", () => {
  const g = M.emptyGrid();
  g[0][0] = 17;
  assert.equal(M.hasDuplicate(g, 2, 1, 17), true);
  assert.equal(M.hasDuplicate(g, 2, 1, "17"), true);
  assert.equal(M.hasDuplicate(g, 2, 1, 7), false);
  assert.equal(M.hasDuplicate(g, 0, 0, 17), false);
});

test("hard canComplete agrees with the brute force for every single entry", () => {
  assert.equal(M.canComplete(M.emptyGrid(), "hard"), true);
  let impossible = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      for (let v = 1; v <= MAX; v++) {
        const g = M.emptyGrid();
        g[r][c] = v;
        const expected = possible(g).length > 0;
        assert.equal(M.canComplete(g, "hard"), expected, `cell ${r},${c} = ${v}`);
        if (!expected) impossible++;
      }
    }
  }
  assert.ok(impossible > 0, "some single entries must be impossible in 1-20 (e.g. a centre of 1)");
});

test("hard canComplete agrees with the brute force on random multi-entry grids", () => {
  let yes = 0;
  let no = 0;
  for (let i = 0; i < 600; i++) {
    const g = M.emptyGrid();
    const n = 1 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) g[Math.floor(Math.random() * 3)][Math.floor(Math.random() * 3)] = 1 + Math.floor(Math.random() * MAX);
    const expected = possible(g).length > 0;
    assert.equal(M.canComplete(g, "hard"), expected, JSON.stringify(g));
    expected ? yes++ : no++;
  }
  assert.ok(yes > 0 && no > 0, `want both outcomes covered (${yes} / ${no})`);
});

test("hard generatePuzzle: valid square in 1-20, few givens, exactly one solution, over many runs", () => {
  const counts = {};
  const totals = new Set();
  for (let i = 0; i < 300; i++) {
    const { puzzle, solution } = M.generatePuzzle(Math.random, "hard");
    assert.equal(M.isMagic(solution, "hard"), true);
    assert.ok(solution.flat().every((v) => v >= 1 && v <= MAX));
    const n = M.countFilled(puzzle);
    counts[n] = (counts[n] || 0) + 1;
    assert.ok(n >= 2 && n <= 4, `got ${n} givens`);
    puzzle.forEach((row, r) => row.forEach((v, c) => v && assert.equal(v, solution[r][c])));
    const found = possible(puzzle); // checked against the independent enumeration, not the module's own
    assert.equal(found.length, 1);
    assert.deepEqual(found[0], solution);
    assert.equal(M.hardMatching(puzzle).length, 1);
    totals.add(solution[0][0] + solution[0][1] + solution[0][2]);
  }
  assert.ok(totals.size > 5, "totals should vary");
  console.log("hard givens used over 300 puzzles:", JSON.stringify(counts));
});

test("hard generatePuzzle is fast and terminates for adversarial randomness", () => {
  let n = 0;
  const rng = () => ((n = (n * 7 + 3) % 10) + 0.5) / 10;
  const { puzzle } = M.generatePuzzle(rng, "hard");
  assert.equal(M.hardMatching(puzzle, 2).length, 1);
  assert.equal(M.hardMatching(M.generatePuzzle(() => 0, "hard").puzzle, 2).length, 1);
  assert.equal(M.hardMatching(M.generatePuzzle(() => 0.999999, "hard").puzzle, 2).length, 1);
  const t = Date.now();
  for (let i = 0; i < 500; i++) M.generatePuzzle(Math.random, "hard");
  assert.ok(Date.now() - t < 3000, `500 puzzles took ${Date.now() - t}ms`);
});

test("hard solution prefers the first completion matching the player's entries", () => {
  const givens = M.emptyGrid();
  givens[1][1] = 10;
  const target = hardSq(10, 2, 5);
  const entries = givens.map((r) => r.slice());
  entries[0][0] = target[0][0];
  entries[0][2] = target[0][2];
  assert.deepEqual(M.solution(givens, entries, "hard"), target);
  const first = M.solution(givens, null, "hard");
  assert.equal(M.isMagic(first, "hard"), true);
  assert.equal(first[1][1], 10);
  assert.ok(possible(givens).some((sq) => key(sq) === key(first)));
  const stray = givens.map((r) => r.slice());
  stray[0][0] = 20;
  stray[0][1] = 20; // matches no square, so it falls back to the givens' first completion
  assert.deepEqual(M.solution(givens, stray, "hard"), first);
  // an entry value no square can have in that cell (found by enumeration) gives no solution
  const bad = M.emptyGrid();
  for (let v = 1; v <= MAX; v++) {
    bad[1][1] = v;
    if (!possible(bad).length) break;
  }
  assert.equal(possible(bad).length, 0);
  assert.equal(M.solution(bad, null, "hard"), null);
});
