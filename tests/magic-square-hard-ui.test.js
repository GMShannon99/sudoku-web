// Hard Level screen flow through a real DOM (jsdom); same eval approach as magic-square-ui.test.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const HTML = read("index.html");
const SRC = [read("sudoku-logic.js"), read("sudoku-ui.js"), read("magic-square-logic.js"), read("magic-square-ui.js")].join("\n;\n");

function run(body) {
  const dom = new JSDOM(HTML, { url: "http://localhost/index.html", runScripts: "dangerously" });
  const window = dom.window;
  window.matchMedia = () => ({ matches: true });
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  window.eval(`
    ${SRC}
    ;
    (function () {
      const $ = (id) => document.getElementById(id);
      const click = (id) => $(id).click();
      const title = () => $("pageTitle").textContent;
      const sub = () => $("difficultyLine").textContent;
      const popup = () => ($("msMessageOverlay").classList.contains("active") ? $("msMessageText").textContent : null);
      const closePopup = () => click("msMessageCloseBtn");
      const cellEl = (grid, n) => $(grid).children[n];
      // types text one keystroke at a time, like a real keyboard
      const keys = (grid, n, text) => { for (const ch of text) { const i = cellEl(grid, n); i.value = i.value + ch; i.dispatchEvent(new Event("input")); } };
      const leave = (grid, n) => cellEl(grid, n).dispatchEvent(new Event("blur"));
      const vals = (grid) => Array.from($(grid).children).map((i) => i.value).join(",");
      const pickHard = () => { $("msLevelHard").checked = true; };
      ${body}
    })();
  `);
  return JSON.parse(window.__result);
}

test("Rules screen: both rule blocks, radios default to Easy, no sub-heading on Rules", () => {
  const r = run(`
    click("magicSquaresBtn");
    const radios = Array.from(document.querySelectorAll("input[name=msLevel]"));
    window.__result = JSON.stringify({
      headings: Array.from(document.querySelectorAll("#msRulesScreen .ms-rules-heading")).map((e) => e.textContent),
      labels: radios.map((x) => x.parentElement.textContent.trim()),
      checked: radios.map((x) => x.checked),
      sub: sub(),
      belowButtons: !!(document.querySelector("#msRulesScreen .controls").compareDocumentPosition(document.querySelector(".ms-level-picker")) & Node.DOCUMENT_POSITION_FOLLOWING),
      inRules: radios.every((x) => x.closest("#msRulesScreen")),
      rules: document.querySelector(".ms-rules").textContent,
    });
  `);
  assert.deepEqual(r.headings, ["Easy Level", "Hard Level"]);
  assert.deepEqual(r.labels, ["Easy Level", "Hard Level"]);
  assert.deepEqual(r.checked, [true, false]);
  assert.equal(r.sub, "");
  assert.equal(r.belowButtons, true);
  assert.equal(r.inRules, true);
  assert.match(r.rules, /1 to 9 is used exactly once/);
  assert.match(r.rules, /1 to 20/);
  assert.doesNotMatch(r.rules, /99/);
  assert.match(r.rules, /no number can be used twice/);
  assert.match(r.rules, /the total isn't fixed/);
});

test("Easy: sub-heading 'Easy Level' on input, puzzle and solution screens", () => {
  const r = run(`
    const out = {};
    click("magicSquaresBtn");
    click("msRulesManualBtn");
    out.input = sub();
    keys("msInputGrid", 4, "5");
    click("msInputDoneBtn");
    out.puzzle = sub();
    click("msPuzzleSolutionBtn");
    out.solution = sub();
    window.__result = JSON.stringify(out);
  `);
  assert.deepEqual(r, { input: "Easy Level", puzzle: "Easy Level", solution: "Easy Level" });
});

test("Easy typing is unchanged: a repeated digit is rejected immediately, 10 is not a digit", () => {
  const r = run(`
    click("magicSquaresBtn");
    click("msRulesManualBtn");
    keys("msInputGrid", 0, "2");
    keys("msInputGrid", 1, "2");
    const dup = [popup(), cellEl("msInputGrid", 1).value];
    closePopup();
    keys("msInputGrid", 2, "1");
    keys("msInputGrid", 2, "0");
    window.__result = JSON.stringify({ dup, ten: [popup(), cellEl("msInputGrid", 2).value] });
  `);
  assert.deepEqual(r.dup, ["No duplicate values vertically, horizontally or diagonally allowed", ""]);
  assert.equal(r.ten[0], "Only numeric values are allowed");
});

test("Hard: sub-heading on every screen; level kept across Show Solution/Return and Exit; reset on home", () => {
  const r = run(`
    const out = {};
    click("magicSquaresBtn");
    pickHard();
    click("msRulesManualBtn");
    out.input = sub();
    keys("msInputGrid", 4, "10");
    click("msInputDoneBtn");
    out.puzzle = sub();
    click("msPuzzleSolutionBtn");
    out.solution = [sub(), title()];
    click("msSolutionReturnBtn");
    out.back = sub();
    click("msPuzzleExitBtn");
    out.exitToInput = sub();
    click("msInputExitBtn");
    out.rules = [sub(), $("msLevelHard").checked];
    click("msRulesGenerateBtn");
    out.generated = sub();
    click("msPuzzleExitBtn");
    click("msRulesExitBtn");
    out.home = [title(), sub(), $("msLevelEasy").checked, $("msLevelHard").checked];
    click("magicSquaresBtn");
    out.afterHome = $("msLevelEasy").checked;
    window.__result = JSON.stringify(out);
  `);
  assert.equal(r.input, "Hard Level");
  assert.equal(r.puzzle, "Hard Level");
  assert.deepEqual(r.solution, ["Hard Level", "Magic Square Solution"]);
  assert.equal(r.back, "Hard Level");
  assert.equal(r.exitToInput, "Hard Level");
  assert.deepEqual(r.rules, ["", true]);
  assert.equal(r.generated, "Hard Level");
  assert.deepEqual(r.home, ["Enter Your Sudoku Puzzle v5.1.1", "", true, false]);
  assert.equal(r.afterHome, true);
});

test("Hard input: 10-20 type smoothly; 21+, 0, 00, letters and duplicates are rejected with the right popup", () => {
  const r = run(`
    click("magicSquaresBtn");
    pickHard();
    click("msRulesManualBtn");
    const G = "msInputGrid";
    const out = {};
    const take = (label, n) => { out[label] = [popup(), cellEl(G, n).value]; if (popup()) closePopup(); };
    keys(G, 0, "1");
    leave(G, 0);
    keys(G, 1, "1"); // a lone 1 may be the start of 15, so no duplicate check yet
    out.lone1 = popup();
    keys(G, 1, "5");
    take("fifteenWhileOneExists", 1);
    keys(G, 2, "15");
    take("dup15", 2);
    keys(G, 3, "20");
    take("twenty", 3);
    keys(G, 4, "21");
    take("twentyOne", 4);
    keys(G, 4, "99");
    take("ninetyNine", 4);
    keys(G, 4, "30");
    take("thirty", 4);
    keys(G, 4, "100");
    take("hundred", 4);
    keys(G, 5, "7");
    take("seven", 5);
    keys(G, 6, "7"); // first digit 3-9 can't grow, so a duplicate is caught at once, without leaving the cell
    take("dupSeven", 6);
    keys(G, 6, "1");
    out.lone1Again = popup(); // pending, same as above
    leave(G, 6);
    take("lone1OnLeave", 6);
    for (const [label, text] of [["zero", "0"], ["zeroZero", "00"], ["letter", "x"], ["minus", "-"]]) {
      keys(G, 8, text);
      take(label, 8);
      cellEl(G, 8).value = "";
    }
    // a leading zero can only arrive by paste (typing the 0 is rejected on its own)
    cellEl(G, 8).value = "05";
    cellEl(G, 8).dispatchEvent(new Event("input"));
    take("leadingZero", 8);
    window.__result = JSON.stringify(out);
  `);
  const NUM = "Only numeric values are allowed";
  const RANGE = "Numbers must be from 1 to 20";
  const DUP = "No duplicate values vertically, horizontally or diagonally allowed";
  assert.equal(r.lone1, null);
  assert.deepEqual(r.fifteenWhileOneExists, [null, "15"]);
  assert.deepEqual(r.dup15, [DUP, ""]);
  assert.deepEqual(r.twenty, [null, "20"]);
  assert.deepEqual(r.twentyOne, [RANGE, ""]);
  assert.deepEqual(r.ninetyNine, [RANGE, ""]);
  assert.deepEqual(r.thirty, [RANGE, ""]);
  assert.deepEqual(r.hundred, [RANGE, ""]);
  assert.deepEqual(r.seven, [null, "7"]);
  assert.deepEqual(r.dupSeven, [DUP, ""]);
  assert.equal(r.lone1Again, null);
  assert.deepEqual(r.lone1OnLeave, [DUP, ""]);
  for (const k of ["zero", "zeroZero", "leadingZero", "letter", "minus"]) assert.deepEqual(r[k], [NUM, ""], k);
});

test("Hard Done: needs a number, refuses impossible numbers, accepts completable ones with locked givens", () => {
  const r = run(`
    click("magicSquaresBtn");
    pickHard();
    click("msRulesManualBtn");
    const G = "msInputGrid";
    const out = {};
    click("msInputDoneBtn");
    out.empty = [popup(), $("msInputScreen").classList.contains("active")];
    closePopup();
    // a centre no hard square can have, found by enumeration rather than assumed
    let badCentre = 0;
    for (let v = 1; v <= 20 && !badCentre; v++) {
      const g = MagicLogic.emptyGrid();
      g[1][1] = v;
      if (!MagicLogic.canComplete(g, "hard")) badCentre = v;
    }
    out.badCentre = badCentre;
    keys(G, 4, String(badCentre));
    leave(G, 4);
    click("msInputDoneBtn");
    out.bad = [popup(), $("msInputScreen").classList.contains("active")];
    closePopup();
    cellEl(G, 4).value = "";
    const sq = MagicLogic.hardMatching(MagicLogic.emptyGrid(), 1)[0];
    out.sq = sq;
    keys(G, 4, String(sq[1][1]));
    keys(G, 0, String(sq[0][0]));
    keys(G, 2, String(sq[0][2]));
    click("msInputDoneBtn");
    out.good = [popup(), title(), sub()];
    out.locked = Array.from($("msPuzzleGrid").children).map((i) => (i.disabled ? i.value : "-")).join(",");
    window.__result = JSON.stringify(out);
  `);
  assert.equal(r.empty[0], "Please enter at least one number");
  assert.equal(r.empty[1], true);
  assert.ok(r.badCentre > 0, "some centre value must be impossible");
  assert.equal(r.bad[0], "These numbers can't be completed into a magic square");
  assert.equal(r.bad[1], true);
  assert.deepEqual(r.good, [null, "Magic Square Puzzle", "Hard Level"]);
  assert.equal(r.locked, [r.sq[0][0], "-", r.sq[0][2], "-", r.sq[1][1], "-", "-", "-", "-"].join(","));
});

test("Hard Generate: 2-3 locked givens; solving the puzzle shows Solved!; a wrong full grid says so", () => {
  const r = run(`
    click("magicSquaresBtn");
    pickHard();
    click("msRulesGenerateBtn");
    const P = "msPuzzleGrid";
    const kids = Array.from($(P).children);
    const out = { givens: kids.filter((i) => i.disabled).length, buttons: Array.from(document.querySelectorAll("#msPuzzleScreen button")).map((b) => b.textContent) };
    click("msPuzzleSolutionBtn");
    const sol = Array.from($("msSolutionGrid").children).map((i) => i.value);
    out.solutionMagic = MagicLogic.isMagic([sol.slice(0, 3), sol.slice(3, 6), sol.slice(6)].map((r) => r.map(Number)), "hard");
    click("msSolutionReturnBtn");
    const empties = [];
    kids.forEach((i, n) => { if (!i.disabled) empties.push(n); });
    // wrong: rotate the right numbers among the empty cells
    const wrong = empties.map((n, k) => sol[empties[(k + 1) % empties.length]]);
    empties.forEach((n, k) => { cellEl(P, n).value = ""; });
    empties.forEach((n, k) => keys(P, n, wrong[k]));
    for (const n of empties) leave(P, n);
    out.wrong = [popup(), $("msStatusLine").textContent];
    empties.forEach((n) => { cellEl(P, n).value = ""; });
    empties.forEach((n) => keys(P, n, sol[n]));
    for (const n of empties) leave(P, n);
    out.solved = $("msStatusLine").textContent;
    window.__result = JSON.stringify(out);
  `);
  assert.ok(r.givens >= 2 && r.givens <= 4, "givens: " + r.givens);
  assert.deepEqual(r.buttons, ["Show Solution", "Exit"]);
  assert.equal(r.solutionMagic, true);
  assert.equal(r.wrong[0], null);
  assert.match(r.wrong[1], /not a magic square/);
  assert.equal(r.solved, "Solved!");
});

test("Hard Show Solution -> Return keeps the entries exactly", () => {
  const r = run(`
    click("magicSquaresBtn");
    pickHard();
    click("msRulesGenerateBtn");
    const P = "msPuzzleGrid";
    const free = Array.from($(P).children).findIndex((i) => !i.disabled);
    // a number from 1-20 that is not already on the grid
    const used = Array.from($(P).children).map((i) => i.value);
    const mine = String([...Array(20).keys()].map((k) => k + 1).find((n) => n > 2 && !used.includes(String(n))));
    keys(P, free, mine);
    leave(P, free);
    const before = vals(P);
    click("msPuzzleSolutionBtn");
    click("msSolutionReturnBtn");
    window.__result = JSON.stringify({ same: vals(P) === before, before, title: title(), sub: sub() });
  `);
  assert.equal(r.same, true);
  assert.equal(r.title, "Magic Square Puzzle");
  assert.equal(r.sub, "Hard Level");
});

test("two-digit cells have a font-size rule and the 3x3 tiers still exist", () => {
  const css = read("magic-square.css");
  assert.match(css, /font-size: max\(16px, calc\(var\(--ms-cell\) \/ 2\)\)/);
  for (const w of [520, 500, 400]) assert.match(css, new RegExp(`max-width: ${w}px`));
});
