/*
 * MAGIC SQUARES -- pure 3x3 magic square logic (digits 1-9 once each, every
 * row, column and both long diagonals summing to 15).
 *
 * Like learn-mode-logic.js this has no DOM knowledge -- plain 3x3 arrays of
 * numbers (0 = empty) -- so it's testable under Node.
 *
 * Two levels: "easy" (1-9 once each, every line = 15; the 8 squares below)
 * and "hard" (nine distinct whole numbers 1-99, every line the same total
 * but not a fixed one). Every function that depends on the level takes it as
 * a last argument defaulting to "easy".
 *
 * To remove Magic Squares entirely: delete magic-square-*.js /
 * magic-square.css, the "MAGIC SQUARES" blocks in index.html, and the
 * version/README lines that mention it.
 */

const MAGIC_SIZE = 3;
const MAGIC_SUM = 15;

// All 8 valid 3x3 magic squares: the four rotations of one square plus
// their mirror images. Built (and de-duplicated) rather than hard-coded so
// the symmetry claim is checked by the tests, not trusted.
function magicBuildAll() {
  const rotate = (g) => g[0].map((_, c) => g.map((row) => row[c]).reverse());
  const mirror = (g) => g.map((row) => row.slice().reverse());
  let g = [
    [2, 7, 6],
    [9, 5, 1],
    [4, 3, 8],
  ];
  const seen = new Map();
  for (let i = 0; i < 4; i++) {
    for (const variant of [g, mirror(g)]) seen.set(variant.flat().join(""), variant);
    g = rotate(g);
  }
  return Array.from(seen.values());
}

const MAGIC_SQUARES = magicBuildAll();

function magicIsDigit(value) {
  return /^[1-9]$/.test(String(value));
}

function magicEmptyGrid() {
  return Array.from({ length: MAGIC_SIZE }, () => Array(MAGIC_SIZE).fill(0));
}

// Is `value` already used anywhere in the grid other than (row, col)? A 3x3
// magic square uses 1-9 exactly once each, so this covers every row, column
// and diagonal a repeat could share and also repeats that share none.
function magicHasDuplicate(grid, row, col, value) {
  const v = Number(value);
  for (let r = 0; r < MAGIC_SIZE; r++) {
    for (let c = 0; c < MAGIC_SIZE; c++) {
      if ((r !== row || c !== col) && grid[r][c] === v) return true;
    }
  }
  return false;
}

// Valid squares that agree with every non-zero entry of `grid`.
function magicMatching(grid) {
  return MAGIC_SQUARES.filter((sq) =>
    sq.every((rowVals, r) => rowVals.every((v, c) => grid[r][c] === 0 || grid[r][c] === v))
  );
}

function magicCanComplete(grid) {
  return magicMatching(grid).length > 0;
}

function magicCountFilled(grid) {
  return grid.flat().filter((v) => v !== 0).length;
}

function magicIsFull(grid) {
  return grid.flat().every((v) => v !== 0);
}

// Full grid that is a real magic square (so 1-9 once each and all 8 lines = 15).
function magicIsMagic(grid) {
  return magicIsFull(grid) && magicMatching(grid).length === 1;
}

// The answer to show for a puzzle: prefers a square that also agrees with the
// player's entries (only matters when a hand-entered puzzle has several
// completions), otherwise the first one matching the givens.
function magicSolution(givens, entries, level = "easy") {
  const first = (grid) =>
    level === "hard" ? magicHardMatching(grid, 1) : magicMatching(grid);
  const withEntries = entries ? first(entries) : [];
  const list = withEntries.length ? withEntries : first(givens);
  return list.length ? list[0].map((row) => row.slice()) : null;
}

function magicShuffled(array, rng) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Random magic square with 3-4 givens that has exactly one completion
// (checked against all 8 squares). Most random 3-4 cell subsets already
// qualify; if a draw doesn't, it is redrawn, and as a last resort givens are
// added until it is unique, so this always terminates with a valid puzzle.
function magicGeneratePuzzle(rng = Math.random, level = "easy") {
  if (level === "hard") return magicHardGeneratePuzzle(rng);
  const cells = [];
  for (let r = 0; r < MAGIC_SIZE; r++) for (let c = 0; c < MAGIC_SIZE; c++) cells.push([r, c]);

  const solution = MAGIC_SQUARES[Math.floor(rng() * MAGIC_SQUARES.length)];
  const build = (positions) => {
    const puzzle = magicEmptyGrid();
    for (const [r, c] of positions) puzzle[r][c] = solution[r][c];
    return puzzle;
  };

  for (let attempt = 0; attempt < 200; attempt++) {
    const count = rng() < 0.5 ? 3 : 4;
    const puzzle = build(magicShuffled(cells, rng).slice(0, count));
    if (magicMatching(puzzle).length === 1) return { puzzle, solution: solution.map((r) => r.slice()) };
  }
  const order = magicShuffled(cells, rng);
  for (let count = 5; count <= 9; count++) {
    const puzzle = build(order.slice(0, count));
    if (magicMatching(puzzle).length === 1) return { puzzle, solution: solution.map((r) => r.slice()) };
  }
  /* unreachable: 9 givens is always unique */
}

// ---------------------------------------------------------------------------
// HARD LEVEL. Any 3x3 magic square (distinct entries, any total) is fixed by
// its centre c and two offsets a, b:
//     c+a    c-a-b   c+b
//     c-a+b  c       c+a-b
//     c-b    c+a+b   c-a
// so every hard-level square can be enumerated as (c, a, b) with all nine
// values distinct and inside 1..99.
// ---------------------------------------------------------------------------
const MAGIC_HARD_MAX = 99;

function magicHardCells(c, a, b) {
  return [c + a, c - a - b, c + b, c - a + b, c, c + a - b, c - b, c + a + b, c - a];
}

// Valid hard squares (as 3x3 grids) that agree with every non-zero entry of
// `grid`, in a fixed order (c, then a, then b ascending). Stops after `limit`.
function magicHardMatching(grid, limit = Infinity) {
  const flat = grid.flat();
  const found = [];
  const seen = new Uint8Array(MAGIC_HARD_MAX + 1);
  for (let c = 1; c <= MAGIC_HARD_MAX; c++) {
    if (flat[4] !== 0 && flat[4] !== c) continue;
    const r = Math.min(c - 1, MAGIC_HARD_MAX - c);
    for (let a = -r; a <= r; a++) {
      if (a === 0) continue;
      for (let b = -r; b <= r; b++) {
        const v = magicHardCells(c, a, b);
        let ok = true;
        for (let i = 0; i < 9 && ok; i++) {
          if (flat[i] !== 0 && flat[i] !== v[i]) ok = false;
        }
        if (!ok) continue;
        seen.fill(0);
        for (let i = 0; i < 9 && ok; i++) {
          if (v[i] < 1 || v[i] > MAGIC_HARD_MAX || seen[v[i]]) ok = false;
          else seen[v[i]] = 1;
        }
        if (!ok) continue;
        found.push([v.slice(0, 3), v.slice(3, 6), v.slice(6)]);
        if (found.length >= limit) return found;
      }
    }
  }
  return found;
}

// Full grid of nine distinct whole numbers 1-99 whose rows, columns and both
// diagonals all share one total.
function magicHardIsMagic(grid) {
  const flat = grid.flat();
  if (flat.length !== 9) return false;
  if (!flat.every((v) => Number.isInteger(v) && v >= 1 && v <= MAGIC_HARD_MAX)) return false;
  if (new Set(flat).size !== 9) return false;
  const g = grid;
  const sums = [
    ...g.map((row) => row[0] + row[1] + row[2]),
    ...[0, 1, 2].map((c) => g[0][c] + g[1][c] + g[2][c]),
    g[0][0] + g[1][1] + g[2][2],
    g[0][2] + g[1][1] + g[2][0],
  ];
  return sums.every((t) => t === sums[0]);
}

function magicHardGeneratePuzzle(rng) {
  const cells = [];
  for (let r = 0; r < MAGIC_SIZE; r++) for (let c = 0; c < MAGIC_SIZE; c++) cells.push([r, c]);
  const pick = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

  // Random valid square: draw (c, a, b) until all nine values are legal.
  let solution = null;
  while (!solution) {
    const c = pick(1, MAGIC_HARD_MAX);
    const r = Math.min(c - 1, MAGIC_HARD_MAX - c);
    if (r < 1) continue;
    const a = pick(-r, r);
    const b = pick(-r, r);
    const v = magicHardCells(c, a, b);
    if (new Set(v).size === 9 && v.every((x) => x >= 1 && x <= MAGIC_HARD_MAX)) {
      solution = [v.slice(0, 3), v.slice(3, 6), v.slice(6)];
    }
  }

  // Three givens in independent positions pin down (c, a, b); a random
  // choice of 3 usually works, otherwise try more givens. Uniqueness is
  // always verified by enumeration (a second match stops the search early).
  const build = (positions) => {
    const puzzle = magicEmptyGrid();
    for (const [r, c] of positions) puzzle[r][c] = solution[r][c];
    return puzzle;
  };
  for (let count = 3; count <= 8; count++) {
    for (let attempt = 0; attempt < (count === 3 ? 12 : 8); attempt++) {
      const puzzle = build(magicShuffled(cells, rng).slice(0, count));
      if (magicHardMatching(puzzle, 2).length === 1) return { puzzle, solution };
    }
  }
  return { puzzle: build(cells), solution }; // unreachable in practice: all nine is unique
}

// ---------------------------------------------------------------------------
// Level-aware entry points.
// ---------------------------------------------------------------------------

// One cell's text: easy = a single digit 1-9, hard = a whole number 1-99
// (no leading zero, so "0" and "00" are rejected).
function magicIsValue(value, level = "easy") {
  return level === "hard" ? /^(?:[1-9]|[1-9][0-9])$/.test(String(value)) : magicIsDigit(value);
}

function magicCanCompleteAt(grid, level = "easy") {
  return level === "hard" ? magicHardMatching(grid, 1).length > 0 : magicCanComplete(grid);
}

function magicIsMagicAt(grid, level = "easy") {
  return level === "hard" ? magicHardIsMagic(grid) : magicIsMagic(grid);
}

const MagicLogic = {
  SIZE: MAGIC_SIZE,
  SUM: MAGIC_SUM,
  SQUARES: MAGIC_SQUARES,
  isDigit: magicIsDigit,
  emptyGrid: magicEmptyGrid,
  hasDuplicate: magicHasDuplicate,
  matching: magicMatching,
  canComplete: magicCanCompleteAt,
  countFilled: magicCountFilled,
  isFull: magicIsFull,
  isMagic: magicIsMagicAt,
  isValue: magicIsValue,
  HARD_MAX: MAGIC_HARD_MAX,
  hardMatching: magicHardMatching,
  solution: magicSolution,
  generatePuzzle: magicGeneratePuzzle,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = MagicLogic;
} else {
  window.MagicLogic = MagicLogic;
}
