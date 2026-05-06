// Spreadsheet formula engine + cell propagation (JavaScript port)

const PURE_NUMBER_RE = /^-?\d+(\.\d+)?$/;

export function generateColumns(n) {
  const cols = [];
  for (let i = 0; i < n; i++) cols.push(String.fromCharCode(65 + i));
  return cols;
}

export function generateRows(n) {
  const rows = [];
  for (let i = 1; i <= n; i++) rows.push(i);
  return rows;
}

export function generateAllIds(cols, rows) {
  return cols.flatMap((c) => rows.map((r) => c + r));
}

export function makeDefaultCells(allIds) {
  const cells = {};
  allIds.forEach((id) => {
    cells[id] = { raw: "", computed: "", formula: false };
  });
  return cells;
}

export function makeGraph(allIds) {
  const deps = {};
  const revDeps = {};
  allIds.forEach((id) => {
    deps[id] = new Set();
    revDeps[id] = new Set();
  });
  return { deps, revDeps };
}

// ── Tokenizer ──────────────────────────────────────────────────────────────
function tokenize(expr, cols) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const col = ch.toUpperCase();
      let j = i + 1;
      let numStr = "";
      while (j < expr.length && /\d/.test(expr[j])) {
        numStr += expr[j];
        j++;
      }
      if (numStr) {
        const row = parseInt(numStr, 10);
        const id = col + row;
        const valid = cols.includes(col) && row >= 1;
        tokens.push({ type: "ref", id, valid });
        i = j;
        continue;
      }
      tokens.push({ type: "unknown", ch });
      i++;
      continue;
    }
    if (/\d/.test(ch) || (ch === "." && /\d/.test(expr[i + 1] || ""))) {
      let num = "";
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i++];
      }
      tokens.push({ type: "num", value: parseFloat(num) });
      continue;
    }
    if ("+-*/()".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    tokens.push({ type: "unknown", ch });
    i++;
  }
  return tokens;
}

function asConcatString(op) {
  return op.raw;
}

function tryEvaluateStringAsNumber(str, cols, getCellValue) {
  if (typeof str !== "string" || str.trim() === "") return null;
  const trimmed = str.trim();
  if (!/[\d+\-.(]/.test(trimmed[0])) return null;
  let result;
  try {
    result = evaluateTokens(tokenize(trimmed, cols), cols, getCellValue, false).value;
  } catch (e) {
    const msg = e.message;
    if (typeof msg === "string" && msg.startsWith("#")) throw e;
    return null;
  }
  if (result.kind === "num") return result.value;
  return null;
}

function refToOperand(id, cols, getCellValue) {
  const v = getCellValue(id);
  if (typeof v === "string" && v.startsWith("#")) throw new Error(v);
  if (typeof v === "number") return { kind: "num", value: v, raw: String(v) };
  const n = tryEvaluateStringAsNumber(v, cols, getCellValue);
  if (n !== null) return { kind: "num", value: n, raw: v };
  return { kind: "str", value: v, raw: v };
}

function evaluateTokens(tokens, cols, getCellValue, topLevel) {
  const refs = new Set();
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];
  const peekOp = (v) => {
    const t = tokens[pos];
    return !!t && t.type === "op" && t.value === v;
  };
  const peekOpAny = (...vals) => vals.some(peekOp);

  function parseExpr() {
    return parseAddSub();
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (peekOpAny("+", "-")) {
      const op = consume().value;
      const right = parseMulDiv();
      if (op === "+") {
        if (left.kind === "num" && right.kind === "num") {
          left = { kind: "num", value: left.value + right.value, raw: "" };
        } else {
          const concat = asConcatString(left) + asConcatString(right);
          left = { kind: "str", value: concat, raw: concat };
        }
      } else {
        if (left.kind !== "num" || right.kind !== "num") throw new Error("#VALUE");
        left = { kind: "num", value: left.value - right.value, raw: "" };
      }
    }
    return left;
  }

  function parseMulDiv() {
    let left = parseUnary();
    while (peekOpAny("*", "/")) {
      const op = consume().value;
      const right = parseUnary();
      if (left.kind !== "num" || right.kind !== "num") throw new Error("#VALUE");
      if (op === "/" && right.value === 0) throw new Error("#DIV/0");
      const value = op === "*" ? left.value * right.value : left.value / right.value;
      left = { kind: "num", value, raw: "" };
    }
    return left;
  }

  function parseUnary() {
    if (peekOp("-")) {
      consume();
      const v = parsePrimary();
      if (v.kind !== "num") throw new Error("#VALUE");
      return { kind: "num", value: -v.value, raw: "" };
    }
    if (peekOp("+")) {
      consume();
      return parsePrimary();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error("#ERROR");
    if (t.type === "num") {
      consume();
      return { kind: "num", value: t.value, raw: String(t.value) };
    }
    if (t.type === "ref") {
      consume();
      if (!t.valid) throw new Error("#REF");
      refs.add(t.id);
      return refToOperand(t.id, cols, getCellValue);
    }
    if (t.type === "op" && t.value === "(") {
      consume();
      const val = parseExpr();
      const closing = peek();
      if (!closing || closing.value !== ")") throw new Error("#ERROR");
      consume();
      return val;
    }
    throw new Error("#ERROR");
  }

  const value = parseExpr();
  if (pos < tokens.length) throw new Error("#ERROR");
  void topLevel;
  return { value, refs };
}

export function evaluateFormula(expr, cols, getCellValue) {
  const result = evaluateTokens(tokenize(expr, cols), cols, getCellValue, true);
  const v = result.value;
  return { value: v.kind === "num" ? v.value : v.value, refs: result.refs };
}

// ── Graph helpers ──────────────────────────────────────────────────────────
function downstreamOrder(startId, revDeps) {
  const visited = new Set([startId]);
  const queue = [...(revDeps[startId] || [])];
  const order = [];
  while (queue.length) {
    const cur = queue.shift();
    if (visited.has(cur)) continue;
    visited.add(cur);
    order.push(cur);
    (revDeps[cur] || new Set()).forEach((d) => queue.push(d));
  }
  return order;
}

function hasCycle(startId, deps) {
  const stack = new Set();
  function dfs(id) {
    if (stack.has(id)) return true;
    stack.add(id);
    for (const dep of deps[id] || []) {
      if (dfs(dep)) return true;
    }
    stack.delete(id);
    return false;
  }
  return dfs(startId);
}

// ── Recalculation ──────────────────────────────────────────────────────────
export function propagate(startId, cellsIn, depsIn, revDepsIn, allIds, cols) {
  const cells = {};
  allIds.forEach((id) => {
    cells[id] = { ...cellsIn[id] };
  });
  const deps = {};
  allIds.forEach((id) => {
    deps[id] = new Set(depsIn[id]);
  });
  const revDeps = {};
  allIds.forEach((id) => {
    revDeps[id] = new Set(revDepsIn[id]);
  });

  function computeOne(id) {
    const cell = cells[id];

    deps[id].forEach((oldInput) => {
      revDeps[oldInput] && revDeps[oldInput].delete(id);
    });
    deps[id] = new Set();

    if (!cell.formula) {
      if (cell.raw === "") {
        cell.computed = "";
      } else if (PURE_NUMBER_RE.test(cell.raw.trim())) {
        cell.computed = parseFloat(cell.raw);
      } else {
        cell.computed = cell.raw;
      }
      return;
    }

    const expr = cell.raw.slice(1);
    try {
      const { value, refs } = evaluateFormula(expr, cols, (refId) => {
        const rc = cells[refId];
        if (!rc) return "#REF";
        return rc.computed;
      });
      refs.forEach((ref) => {
        deps[id].add(ref);
        if (!revDeps[ref]) revDeps[ref] = new Set();
        revDeps[ref].add(id);
      });
      if (hasCycle(id, deps)) {
        cell.computed = "#CIRCULAR";
        deps[id].forEach((ref) => revDeps[ref] && revDeps[ref].delete(id));
        deps[id] = new Set();
      } else {
        cell.computed = value;
      }
    } catch (e) {
      cell.computed = e.message || "#ERROR";
    }
  }

  computeOne(startId);
  const order = downstreamOrder(startId, revDeps);
  order.forEach((id) => computeOne(id));

  return { cells, deps, revDeps };
}

// ── Snapshots for undo/redo ────────────────────────────────────────────────
export function takeSnapshot(cells, deps, revDeps, allIds) {
  return {
    cells: Object.fromEntries(allIds.map((id) => [id, { ...cells[id] }])),
    deps: Object.fromEntries(allIds.map((id) => [id, [...deps[id]]])),
    revDeps: Object.fromEntries(allIds.map((id) => [id, [...revDeps[id]]])),
  };
}

export function restoreSnapshot(snap, allIds) {
  const cells = Object.fromEntries(allIds.map((id) => [id, { ...snap.cells[id] }]));
  const deps = Object.fromEntries(allIds.map((id) => [id, new Set(snap.deps[id])]));
  const revDeps = Object.fromEntries(allIds.map((id) => [id, new Set(snap.revDeps[id])]));
  return { cells, deps, revDeps };
}

export function formatComputed(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return parseFloat(v.toPrecision(10)).toString();
  return String(v);
}
