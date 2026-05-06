// Consolidated spreadsheet application using React.createElement
// All components bundled for browser compatibility

const { useState, useEffect, useRef, useCallback } = React;

// ─── Utility Functions ─────────────────────────────────────────────────────────

function generateColumns(n) {
  const cols = [];
  for (let i = 0; i < n; i++) {
    cols.push(String.fromCharCode(65 + i));
  }
  return cols;
}

function generateRows(n) {
  const rows = [];
  for (let i = 1; i <= n; i++) {
    rows.push(i);
  }
  return rows;
}

function generateAllIds(cols, rows) {
  return cols.flatMap(c => rows.map(r => c + r));
}

// ─── Formula Engine ───────────────────────────────────────────────────────────

function tokenize(expr, COLS) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }

    if (/[A-Za-z]/.test(ch)) {
      const col = ch.toUpperCase();
      let j = i + 1;
      let numStr = '';
      while (j < expr.length && /\d/.test(expr[j])) { numStr += expr[j]; j++; }
      if (numStr) {
        const row = parseInt(numStr, 10);
        const id = col + row;
        const valid = COLS.includes(col) && row >= 1;
        tokens.push({ type: 'ref', id, valid });
        i = j;
        continue;
      }
      tokens.push({ type: 'unknown', ch });
      i++;
      continue;
    }

    if (/\d/.test(ch) || (ch === '.' && /\d/.test(expr[i+1] || ''))) {
      let num = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) { num += expr[i++]; }
      tokens.push({ type: 'num', value: parseFloat(num) });
      continue;
    }

    if ('+-*/()'.includes(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue; }

    tokens.push({ type: 'unknown', ch }); i++;
  }
  return tokens;
}

function evaluateExpr(expr, getCellValue, COLS) {
  const tokens = tokenize(expr, COLS);
  const refs = new Set();
  let pos = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr() { return parseAddSub(); }

  function parseAddSub() {
    let left = parseMulDiv();
    while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const right = parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv() {
    let left = parseUnary();
    while (peek() && peek().type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = consume().value;
      const right = parseUnary();
      if (op === '/' && right === 0) throw new Error('#DIV/0');
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  function parseUnary() {
    if (peek() && peek().type === 'op' && peek().value === '-') { consume(); return -parsePrimary(); }
    if (peek() && peek().type === 'op' && peek().value === '+') { consume(); return parsePrimary(); }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error('#ERROR');

    if (t.type === 'num') { consume(); return t.value; }

    if (t.type === 'ref') {
      consume();
      if (!t.valid) throw new Error('#REF');
      refs.add(t.id);
      const v = getCellValue(t.id);
      if (typeof v === 'string' && v.startsWith('#')) throw new Error(v);
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    }

    if (t.type === 'op' && t.value === '(') {
      consume();
      const val = parseExpr();
      const closing = peek();
      if (!closing || closing.value !== ')') throw new Error('#ERROR');
      consume();
      return val;
    }

    throw new Error('#ERROR');
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new Error('#ERROR');
  return { value: result, refs };
}

// ─── Graph Utilities ──────────────────────────────────────────────────────────

function makeGraph(ALL_IDS) {
  const deps = {}, revDeps = {};
  ALL_IDS.forEach(id => { deps[id] = new Set(); revDeps[id] = new Set(); });
  return { deps, revDeps };
}

function downstreamOrder(startId, revDeps) {
  const visited = new Set([startId]);
  const queue = [...(revDeps[startId] || [])];
  const order = [];
  while (queue.length) {
    const cur = queue.shift();
    if (visited.has(cur)) continue;
    visited.add(cur);
    order.push(cur);
    (revDeps[cur] || new Set()).forEach(d => queue.push(d));
  }
  return order;
}

function hasCycle(startId, deps) {
  const stack = new Set();
  function dfs(id) {
    if (stack.has(id)) return true;
    stack.add(id);
    for (const dep of (deps[id] || [])) {
      if (dfs(dep)) return true;
    }
    stack.delete(id);
    return false;
  }
  return dfs(startId);
}

// ─── Cell Model ───────────────────────────────────────────────────────────────

function makeDefaultCells(ALL_IDS) {
  const cells = {};
  ALL_IDS.forEach(id => { cells[id] = { raw: '', computed: '', formula: false }; });
  return cells;
}

function propagate(startId, cellsIn, depsIn, revDepsIn, ALL_IDS, COLS, numRows) {
  const cells = {};
  ALL_IDS.forEach(id => { cells[id] = { ...cellsIn[id] }; });
  const deps = {};
  ALL_IDS.forEach(id => { deps[id] = new Set(depsIn[id]); });
  const revDeps = {};
  ALL_IDS.forEach(id => { revDeps[id] = new Set(revDepsIn[id]); });

  function computeOne(id) {
    const cell = cells[id];

    deps[id].forEach(oldInput => {
      revDeps[oldInput] && revDeps[oldInput].delete(id);
    });
    deps[id] = new Set();

    if (!cell.formula) {
      const n = parseFloat(cell.raw);
      cell.computed = isNaN(n) ? cell.raw : n;
      return;
    }

    const expr = cell.raw.slice(1);
    try {
      const { value, refs } = evaluateExpr(expr, refId => {
        const rc = cells[refId];
        if (!rc) return '#REF';
        return rc.computed;
      }, COLS);

      refs.forEach(ref => {
        deps[id].add(ref);
        if (!revDeps[ref]) revDeps[ref] = new Set();
        revDeps[ref].add(id);
      });

      if (hasCycle(id, deps)) {
        cell.computed = '#CIRCULAR';
        deps[id].forEach(ref => revDeps[ref] && revDeps[ref].delete(id));
        deps[id] = new Set();
      } else {
        cell.computed = value;
      }
    } catch (e) {
      cell.computed = e.message || '#ERROR';
    }
  }

  computeOne(startId);
  const order = downstreamOrder(startId, revDeps);
  order.forEach(id => computeOne(id));

  return { cells, deps, revDeps };
}

function takeSnapshot(cells, deps, revDeps, ALL_IDS) {
  return {
    cells: Object.fromEntries(ALL_IDS.map(id => [id, { ...cells[id] }])),
    deps: Object.fromEntries(ALL_IDS.map(id => [id, [...deps[id]]])),
    revDeps: Object.fromEntries(ALL_IDS.map(id => [id, [...revDeps[id]]])),
  };
}

function restoreSnapshot(snap, ALL_IDS) {
  const cells = Object.fromEntries(ALL_IDS.map(id => [id, { ...snap.cells[id] }]));
  const deps = Object.fromEntries(ALL_IDS.map(id => [id, new Set(snap.deps[id])]));
  const revDeps = Object.fromEntries(ALL_IDS.map(id => [id, new Set(snap.revDeps[id])]));
  return { cells, deps, revDeps };
}

// ─── Components ────────────────────────────────────────────────────────────────

function Header({ selected, formulaValue, onChange, onFocus, onBlur, onKeyDown, historyLength, futureLength, onUndo, onRedo }) {
  return React.createElement('div', { className: 'toolbar' },
    React.createElement('span', { className: 'cell-ref' }, selected || '—'),
    React.createElement('input', {
      className: 'formula-bar',
      value: formulaValue,
      placeholder: 'Select a cell to edit…',
      onChange: onChange,
      onFocus: onFocus,
      onBlur: onBlur,
      onKeyDown: onKeyDown
    }),
    React.createElement('div', { className: 'btn-group' },
      React.createElement('button', {
        className: 'btn',
        onClick: onUndo,
        disabled: !historyLength,
        title: 'Undo (Ctrl+Z)'
      }, '↩ Undo'),
      React.createElement('button', {
        className: 'btn',
        onClick: onRedo,
        disabled: !futureLength,
        title: 'Redo (Ctrl+Y)'
      }, '↪ Redo'),
    ),
    React.createElement('span', { className: 'status-txt' },
      historyLength ? `${historyLength} step${historyLength > 1 ? 's' : ''} in history` : 'no history'
    )
  );
}

function Footer() {
  return React.createElement('div', { className: 'info-bar' },
    React.createElement('span', { className: 'legend' },
      React.createElement('span', { className: 'dot dep' }),
      'depends on'
    ),
    React.createElement('span', { className: 'legend' },
      React.createElement('span', { className: 'dot rev' }),
      'dependents'
    ),
    React.createElement('span', { className: 'shortcuts' },
      'Double-click or Enter to edit · Arrow keys to navigate · Ctrl+Z/Y to undo/redo · Delete to clear'
    )
  );
}

function GridConfigModal({ isOpen, onClose, onSubmit, defaultRows, defaultCols }) {
  const [rows, setRows] = useState(defaultRows);
  const [cols, setCols] = useState(defaultCols);

  const handleSubmit = () => {
    const numRows = Math.max(1, Math.min(100, parseInt(rows) || 10));
    const numCols = Math.max(1, Math.min(26, parseInt(cols) || 10));
    onSubmit(numRows, numCols);
    onClose();
  };

  if (!isOpen) return null;

  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', { className: 'modal-content' },
      React.createElement('h2', null, 'Configure Grid Size'),
      React.createElement('div', { className: 'modal-form' },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Rows (1-100):'),
          React.createElement('input', {
            type: 'number',
            value: rows,
            onChange: e => setRows(e.target.value),
            min: 1,
            max: 100
          })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Columns (1-26):'),
          React.createElement('input', {
            type: 'number',
            value: cols,
            onChange: e => setCols(e.target.value),
            min: 1,
            max: 26
          })
        )
      ),
      React.createElement('div', { className: 'modal-buttons' },
        React.createElement('button', {
          className: 'btn btn-primary',
          onClick: handleSubmit
        }, 'Apply'),
        React.createElement('button', {
          className: 'btn btn-secondary',
          onClick: onClose
        }, 'Cancel')
      )
    )
  );
}

function Sheet({ COLS, ROWS, cells, selected, editing, editVal, selDepsSet, selRevDepsSet, onCellClick, onCellDoubleClick, cellInputRef, onCellInputChange, onCellInputBlur, onCellInputKeyDown }) {
  function fmtComputed(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') {
      return parseFloat(v.toPrecision(10)).toString();
    }
    return String(v);
  }

  return React.createElement('div', { className: 'grid-wrapper' },
    React.createElement('table', { className: 'grid' },
      React.createElement('thead', null,
        React.createElement('tr', null,
          React.createElement('th', { className: 'corner' }),
          ...COLS.map(c => React.createElement('th', { key: c, className: 'col-header' }, c))
        )
      ),
      React.createElement('tbody', null,
        ...ROWS.map(row =>
          React.createElement('tr', { key: row },
            React.createElement('td', { className: 'row-header' }, row),
            ...COLS.map(col => {
              const id = col + row;
              const cell = cells[id];
              const isSelected = selected === id;
              const isDep = !isSelected && selDepsSet && selDepsSet.has(id);
              const isRevDep = !isSelected && selRevDepsSet && selRevDepsSet.has(id);
              const computed = fmtComputed(cell.computed);
              const isErr = typeof cell.computed === 'string' && cell.computed.startsWith('#');
              const isNum = typeof cell.computed === 'number';

              let tdCls = 'cell-td';
              if (isSelected) tdCls += ' selected';
              else if (isDep) tdCls += ' dep-highlight';
              else if (isRevDep) tdCls += ' rev-dep-highlight';

              return React.createElement('td', {
                key: id,
                className: tdCls,
                onClick: () => onCellClick(id),
                onDoubleClick: () => onCellDoubleClick(id)
              },
                (isSelected && editing)
                  ? React.createElement('input', {
                      className: 'cell-input',
                      ref: cellInputRef,
                      value: editVal,
                      onChange: onCellInputChange,
                      onBlur: () => onCellInputBlur(id),
                      onKeyDown: e => onCellInputKeyDown(e, id)
                    })
                  : React.createElement('span', {
                      className: 'cell-display' + (isErr ? ' is-err' : isNum ? ' is-num' : ' is-text')
                    }, computed)
              );
            })
          )
        )
      )
    )
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

function App() {
  const [numCols, setNumCols] = useState(10);
  const [numRows, setNumRows] = useState(10);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const COLS = generateColumns(numCols);
  const ROWS = generateRows(numRows);
  const ALL_IDS = generateAllIds(COLS, ROWS);

  const [cells, setCells] = useState(() => makeDefaultCells(ALL_IDS));
  const [deps, setDeps] = useState(() => makeGraph(ALL_IDS).deps);
  const [revDeps, setRevDeps] = useState(() => makeGraph(ALL_IDS).revDeps);

  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const cellInputRef = useRef(null);

  const commitCell = useCallback((id, rawVal) => {
    const isFormula = rawVal.trimStart().startsWith('=');

    const snap = takeSnapshot(cells, deps, revDeps, ALL_IDS);
    setHistory(h => [...h.slice(-49), snap]);
    setFuture([]);

    const nextCells = { ...cells };
    ALL_IDS.forEach(cid => { nextCells[cid] = { ...cells[cid] }; });
    nextCells[id] = { raw: rawVal, computed: '', formula: isFormula };

    const result = propagate(id, nextCells, deps, revDeps, ALL_IDS, COLS, numRows);
    setCells(result.cells);
    setDeps(result.deps);
    setRevDeps(result.revDeps);
  }, [cells, deps, revDeps, ALL_IDS, COLS, numRows]);

  const undo = useCallback(() => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    const cur = takeSnapshot(cells, deps, revDeps, ALL_IDS);
    setFuture(f => [cur, ...f.slice(0, 49)]);
    setHistory(h => h.slice(0, -1));
    const restored = restoreSnapshot(prev, ALL_IDS);
    setCells(restored.cells);
    setDeps(restored.deps);
    setRevDeps(restored.revDeps);
    setEditing(false);
  }, [history, cells, deps, revDeps, ALL_IDS]);

  const redo = useCallback(() => {
    if (!future.length) return;
    const next = future[0];
    const cur = takeSnapshot(cells, deps, revDeps, ALL_IDS);
    setHistory(h => [...h.slice(-49), cur]);
    setFuture(f => f.slice(1));
    const restored = restoreSnapshot(next, ALL_IDS);
    setCells(restored.cells);
    setDeps(restored.deps);
    setRevDeps(restored.revDeps);
    setEditing(false);
  }, [future, cells, deps, revDeps, ALL_IDS]);

  function moveSelection(id, dir) {
    const col = id[0];
    const row = parseInt(id.slice(1));
    const ci = COLS.indexOf(col);
    let nc = ci, nr = row;
    if (dir === 'ArrowRight' || dir === 'Tab') nc = Math.min(numCols - 1, ci + 1);
    if (dir === 'ArrowLeft')  nc = Math.max(0, ci - 1);
    if (dir === 'ArrowDown' || dir === 'Enter') nr = Math.min(numRows, row + 1);
    if (dir === 'ArrowUp')    nr = Math.max(1, row - 1);
    return COLS[nc] + nr;
  }

  const startEdit = useCallback((id, initialChar = null) => {
    setSelected(id);
    setEditing(true);
    setEditVal(initialChar !== null ? initialChar : cells[id].raw);
    setTimeout(() => cellInputRef.current && cellInputRef.current.focus(), 0);
  }, [cells]);

  const finishEdit = useCallback((id, val) => {
    setEditing(false);
    if (val !== cells[id].raw) commitCell(id, val);
  }, [cells, commitCell]);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); return; }

      if (!selected) return;
      if (editing) return;

      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
        setSelected(moveSelection(selected, e.key));
      } else if (e.key === 'Enter' || e.key === 'F2') {
        startEdit(selected);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        commitCell(selected, '');
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        startEdit(selected, e.key);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, editing, undo, redo, startEdit, commitCell]);

  const handleGridResize = (rows, cols) => {
    setNumRows(rows);
    setNumCols(cols);
    const newCols = generateColumns(cols);
    const newRows = generateRows(rows);
    const newAllIds = generateAllIds(newCols, newRows);
    setCells(makeDefaultCells(newAllIds));
    setDeps(makeGraph(newAllIds).deps);
    setRevDeps(makeGraph(newAllIds).revDeps);
    setSelected(null);
    setEditing(false);
    setHistory([]);
    setFuture([]);
  };

  const selDepsSet = selected ? deps[selected] : new Set();
  const selRevDepsSet = selected ? revDeps[selected] : new Set();
  const selCell = selected ? cells[selected] : null;

  return React.createElement('div', { className: 'app' },
    React.createElement(Header, {
      selected: selected,
      formulaValue: editing ? editVal : (selCell ? selCell.raw : ''),
      onChange: e => {
        if (!selected) return;
        setEditVal(e.target.value);
        if (!editing) setEditing(true);
      },
      onFocus: () => {
        if (selected && !editing) {
          setEditing(true);
          setEditVal(selCell ? selCell.raw : '');
        }
      },
      onBlur: () => {
        if (selected && editing) finishEdit(selected, editVal);
      },
      onKeyDown: e => {
        if (e.key === 'Enter') { e.preventDefault(); if (selected) finishEdit(selected, editVal); }
        if (e.key === 'Escape') { setEditing(false); }
      },
      historyLength: history.length,
      futureLength: future.length,
      onUndo: undo,
      onRedo: redo
    }),

    React.createElement('button', {
      className: 'btn btn-config',
      onClick: () => setShowConfigModal(true),
      title: `Grid: ${numCols}×${numRows} cells`
    }, `⚙ ${numCols}×${numRows}`),

    React.createElement(Sheet, {
      COLS: COLS,
      ROWS: ROWS,
      cells: cells,
      selected: selected,
      editing: editing,
      editVal: editVal,
      selDepsSet: selDepsSet,
      selRevDepsSet: selRevDepsSet,
      onCellClick: (id) => {
        if (editing && selected && selected !== id) finishEdit(selected, editVal);
        setSelected(id);
        setEditing(false);
      },
      onCellDoubleClick: (id) => startEdit(id),
      cellInputRef: cellInputRef,
      onCellInputChange: (e) => setEditVal(e.target.value),
      onCellInputBlur: (id) => finishEdit(id, editVal),
      onCellInputKeyDown: (e, id) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishEdit(id, editVal);
          setSelected(moveSelection(id, 'Enter'));
        } else if (e.key === 'Tab') {
          e.preventDefault();
          finishEdit(id, editVal);
          setSelected(moveSelection(id, 'Tab'));
        } else if (e.key === 'Escape') {
          setEditing(false);
          setEditVal(cells[id].raw);
        } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !editVal.startsWith('=')) {
          e.preventDefault();
          finishEdit(id, editVal);
          setSelected(moveSelection(id, e.key));
        }
      }
    }),

    React.createElement(Footer),

    React.createElement(GridConfigModal, {
      isOpen: showConfigModal,
      onClose: () => setShowConfigModal(false),
      onSubmit: handleGridResize,
      defaultRows: numRows,
      defaultCols: numCols
    })
  );
}

// Mount the app
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
