import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateAllIds,
  generateColumns,
  generateRows,
  makeDefaultCells,
  makeGraph,
  propagate,
  restoreSnapshot,
  takeSnapshot,
} from "@/lib/spreadsheet/engine";
import { GridConfigModal } from "./GridConfigModal";
import { SheetGrid } from "./SheetGrid";
import { Toolbar } from "./Toolbar";

export function Spreadsheet() {
  const [numCols, setNumCols] = useState(10);
  const [numRows, setNumRows] = useState(15);
  const [showConfig, setShowConfig] = useState(false);

  const COLS = useMemo(() => generateColumns(numCols), [numCols]);
  const ROWS = useMemo(() => generateRows(numRows), [numRows]);
  const ALL_IDS = useMemo(() => generateAllIds(COLS, ROWS), [COLS, ROWS]);

  const [cells, setCells] = useState(() => makeDefaultCells(generateAllIds(generateColumns(10), generateRows(15))));
  const initialGraph = useMemo(() => makeGraph(generateAllIds(generateColumns(10), generateRows(15))), []);
  const [deps, setDeps] = useState(() => initialGraph.deps);
  const [revDeps, setRevDeps] = useState(() => initialGraph.revDeps);

  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState("");

  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const cellInputRef = useRef(null);

  const commitCell = useCallback(
    (id, rawVal) => {
      const isFormula = rawVal.trimStart().startsWith("=");
      const snap = takeSnapshot(cells, deps, revDeps, ALL_IDS);
      setHistory((h) => [...h.slice(-49), snap]);
      setFuture([]);

      const nextCells = { ...cells };
      ALL_IDS.forEach((cid) => {
        nextCells[cid] = { ...cells[cid] };
      });
      const prev = cells[id] || { raw: "", computed: "", formula: false };
      nextCells[id] = { raw: rawVal, computed: "", formula: isFormula, bold: prev.bold };

      const result = propagate(id, nextCells, deps, revDeps, ALL_IDS, COLS);
      setCells(result.cells);
      setDeps(result.deps);
      setRevDeps(result.revDeps);
    },
    [cells, deps, revDeps, ALL_IDS, COLS],
  );

  const toggleBold = useCallback(() => {
    if (!selected) return;
    const snap = takeSnapshot(cells, deps, revDeps, ALL_IDS);
    setHistory((h) => [...h.slice(-49), snap]);
    setFuture([]);
    setCells((prev) => {
      const next = { ...prev };
      const cur = prev[selected];
      next[selected] = { ...cur, bold: !cur.bold };
      return next;
    });
  }, [selected, cells, deps, revDeps, ALL_IDS]);

  const undo = useCallback(() => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    const cur = takeSnapshot(cells, deps, revDeps, ALL_IDS);
    setFuture((f) => [cur, ...f.slice(0, 49)]);
    setHistory((h) => h.slice(0, -1));
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
    setHistory((h) => [...h.slice(-49), cur]);
    setFuture((f) => f.slice(1));
    const restored = restoreSnapshot(next, ALL_IDS);
    setCells(restored.cells);
    setDeps(restored.deps);
    setRevDeps(restored.revDeps);
    setEditing(false);
  }, [future, cells, deps, revDeps, ALL_IDS]);

  const moveSelection = useCallback(
    (id, dir) => {
      const col = id[0];
      const row = parseInt(id.slice(1));
      const ci = COLS.indexOf(col);
      let nc = ci;
      let nr = row;
      if (dir === "ArrowRight" || dir === "Tab") nc = Math.min(numCols - 1, ci + 1);
      if (dir === "ArrowLeft") nc = Math.max(0, ci - 1);
      if (dir === "ArrowDown" || dir === "Enter") nr = Math.min(numRows, row + 1);
      if (dir === "ArrowUp") nr = Math.max(1, row - 1);
      return COLS[nc] + nr;
    },
    [COLS, numCols, numRows],
  );

  const startEdit = useCallback(
    (id, initialChar = null) => {
      setSelected(id);
      setEditing(true);
      setEditVal(initialChar !== null ? initialChar : cells[id]?.raw ?? "");
      setTimeout(() => cellInputRef.current?.focus(), 0);
    },
    [cells],
  );

  const finishEdit = useCallback(
    (id, val) => {
      setEditing(false);
      if (val !== (cells[id]?.raw ?? "")) commitCell(id, val);
    },
    [cells, commitCell],
  );

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        toggleBold();
        return;
      }
      if (!selected) return;
      if (editing) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setSelected(moveSelection(selected, e.key));
      } else if (e.key === "Enter" || e.key === "F2") {
        startEdit(selected);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        commitCell(selected, "");
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        startEdit(selected, e.key);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, editing, undo, redo, startEdit, commitCell, moveSelection, toggleBold]);

  const handleGridResize = (rows, cols) => {
    setNumRows(rows);
    setNumCols(cols);
    const ids = generateAllIds(generateColumns(cols), generateRows(rows));
    setCells(makeDefaultCells(ids));
    const g = makeGraph(ids);
    setDeps(g.deps);
    setRevDeps(g.revDeps);
    setSelected(null);
    setEditing(false);
    setHistory([]);
    setFuture([]);
  };

  const selDeps = selected ? deps[selected] || new Set() : new Set();
  const selRevDeps = selected ? revDeps[selected] || new Set() : new Set();
  const selCell = selected ? cells[selected] : null;

  return (
    <div className="flex h-screen flex-col gap-2 bg-background p-3">
      <Toolbar
        selected={selected}
        formulaValue={editing ? editVal : selCell?.raw ?? ""}
        onChange={(e) => {
          if (!selected) return;
          setEditVal(e.target.value);
          if (!editing) setEditing(true);
        }}
        onFocus={() => {
          if (selected && !editing) {
            setEditing(true);
            setEditVal(selCell?.raw ?? "");
          }
        }}
        onBlur={() => {
          if (selected && editing) finishEdit(selected, editVal);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (selected) finishEdit(selected, editVal);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        historyLength={history.length}
        futureLength={future.length}
        onUndo={undo}
        onRedo={redo}
        onToggleBold={toggleBold}
        isBold={!!selCell?.bold}
        numCols={numCols}
        numRows={numRows}
        onOpenConfig={() => setShowConfig(true)}
      />

      <SheetGrid
        cols={COLS}
        rows={ROWS}
        cells={cells}
        selected={selected}
        editing={editing}
        editVal={editVal}
        selDeps={selDeps}
        selRevDeps={selRevDeps}
        cellInputRef={cellInputRef}
        onCellClick={(id) => {
          if (editing && selected && selected !== id) finishEdit(selected, editVal);
          setSelected(id);
          setEditing(false);
        }}
        onCellDoubleClick={(id) => startEdit(id)}
        onCellInputChange={(e) => setEditVal(e.target.value)}
        onCellInputBlur={(id) => finishEdit(id, editVal)}
        onCellInputKeyDown={(e, id) => {
          if (e.key === "Enter") {
            e.preventDefault();
            finishEdit(id, editVal);
            setSelected(moveSelection(id, "Enter"));
          } else if (e.key === "Tab") {
            e.preventDefault();
            finishEdit(id, editVal);
            setSelected(moveSelection(id, "Tab"));
          } else if (e.key === "Escape") {
            setEditing(false);
            setEditVal(cells[id]?.raw ?? "");
          } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !editVal.startsWith("=")) {
            e.preventDefault();
            finishEdit(id, editVal);
            setSelected(moveSelection(id, e.key));
          }
        }}
      />

      <div className="flex flex-wrap items-center gap-4 px-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-cell-dep ring-1 ring-primary/40" />
          depends on
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-cell-rev-dep ring-1 ring-emerald-600/40" />
          dependents
        </span>
        <span className="ml-auto">
          Double-click or Enter to edit · Arrow keys to navigate · Ctrl+B bold · Ctrl+Z/Y undo/redo · Delete to clear
        </span>
      </div>

      <GridConfigModal
        open={showConfig}
        onOpenChange={setShowConfig}
        onSubmit={handleGridResize}
        defaultRows={numRows}
        defaultCols={numCols}
      />
    </div>
  );
}
