/*
 * MAGIC SQUARES -- pure 3x3 magic square logic (digits 1-9 once each, every
 * row, column and both long diagonals summing to 15).
 *
 * Like learn-mode-logic.js this has no DOM knowledge -- plain 3x3 arrays of
 * numbers (0 = empty) -- so it's testable under Node.
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
function magicSolution(givens, entries) {
  const withEntries = entries ? magicMatching(entries) : [];
  const list = withEntries.length ? withEntries : magicMatching(givens);
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
function magicGeneratePuzzle(rng = Math.random) {
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

const MagicLogic = {
  SIZE: MAGIC_SIZE,
  SUM: MAGIC_SUM,
  SQUARES: MAGIC_SQUARES,
  isDigit: magicIsDigit,
  emptyGrid: magicEmptyGrid,
  hasDuplicate: magicHasDuplicate,
  matching: magicMatching,
  canComplete: magicCanComplete,
  countFilled: magicCountFilled,
  isFull: magicIsFull,
  isMagic: magicIsMagic,
  solution: magicSolution,
  generatePuzzle: magicGeneratePuzzle,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = MagicLogic;
} else {
  window.MagicLogic = MagicLogic;
}
