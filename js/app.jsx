import React from 'react';
import { Header } from './Header.jsx';
import { Footer } from './Footer.jsx';
import { Sheet } from './Sheet.jsx';
import { GridConfigModal } from './GridConfigModal.jsx';
import { makeDefaultCells, propagate, takeSnapshot, restoreSnapshot } from './cellModel.js';
import { makeGraph } from './graphUtils.js';

const { useState, useEffect, useRef, useCallback } = React;

// Generate column letters A-Z
function generateColumns(n) {
  const cols = [];
  for (let i = 0; i < n; i++) {
    cols.push(String.fromCharCode(65 + i));
  }
  return cols;
}

// Generate row numbers
function generateRows(n) {
  const rows = [];
  for (let i = 1; i <= n; i++) {
    rows.push(i);
  }
  return rows;
}

// Generate all cell IDs
function generateAllIds(cols, rows) {
  return cols.flatMap(c => rows.map(r => c + r));
}

function App() {
  // Grid configuration
  const [numCols, setNumCols] = useState(10);
  const [numRows, setNumRows] = useState(10);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Generate dynamic columns and rows
  const COLS = generateColumns(numCols);
  const ROWS = generateRows(numRows);
  const ALL_IDS = generateAllIds(COLS, ROWS);

  // Cell state
  const [cells, setCells] = useState(() => makeDefaultCells(ALL_IDS));
  const [deps, setDeps] = useState(() => makeGraph(ALL_IDS).deps);
  const [revDeps, setRevDeps] = useState(() => makeGraph(ALL_IDS).revDeps);

  // UI state
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  // History state
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const cellInputRef = useRef(null);

  // ── Commit a cell value ────────────────────────────────────────────────────
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

  // ── Undo / Redo ────────────────────────────────────────────────────────────
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

  // ── Keyboard navigation helper ─────────────────────────────────────────────
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

  // ── Start editing a cell ───────────────────────────────────────────────────
  const startEdit = useCallback((id, initialChar = null) => {
    setSelected(id);
    setEditing(true);
    setEditVal(initialChar !== null ? initialChar : cells[id].raw);
    setTimeout(() => cellInputRef.current && cellInputRef.current.focus(), 0);
  }, [cells]);

  // ── Finish editing ─────────────────────────────────────────────────────────
  const finishEdit = useCallback((id, val) => {
    setEditing(false);
    if (val !== cells[id].raw) commitCell(id, val);
  }, [cells, commitCell]);

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
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

  // ── Grid resize handler ────────────────────────────────────────────────────
  const handleGridResize = (rows, cols) => {
    setNumRows(rows);
    setNumCols(cols);
    setCells(makeDefaultCells(generateAllIds(generateColumns(cols), generateRows(rows))));
    setDeps(makeGraph(generateAllIds(generateColumns(cols), generateRows(rows))).deps);
    setRevDeps(makeGraph(generateAllIds(generateColumns(cols), generateRows(rows))).revDeps);
    setSelected(null);
    setEditing(false);
    setHistory([]);
    setFuture([]);
  };

  // ── Dependency highlight sets ──────────────────────────────────────────────
  const selDepsSet = selected ? deps[selected] : new Set();
  const selRevDepsSet = selected ? revDeps[selected] : new Set();

  const selCell = selected ? cells[selected] : null;

  // ─── Render ────────────────────────────────────────────────────────────────
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
      title: `Grid: ${numCols}x${numRows} cells`
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

// Export App so it can be used in index.html
window.App = App;
