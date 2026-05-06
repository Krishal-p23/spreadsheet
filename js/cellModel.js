import { evaluateExpr } from './formulaEngine.js';
import { downstreamOrder, hasCycle } from './graphUtils.js';

// ─── Cell Model ───────────────────────────────────────────────────────────────

export function makeDefaultCells(ALL_IDS) {
  const cells = {};
  ALL_IDS.forEach(id => { cells[id] = { raw: '', computed: '', formula: false }; });
  return cells;
}

/**
 * Core recalculation function.
 * Updates `startId` and all downstream dependents.
 * Performs shallow-clone of cells and graph structures for immutable state updates.
 *
 * @returns { cells, deps, revDeps }
 */
export function propagate(startId, cellsIn, depsIn, revDepsIn, ALL_IDS, COLS, MAX_ROW) {
  // Shallow clone all cell objects and graph sets
  const cells = {};
  ALL_IDS.forEach(id => { cells[id] = { ...cellsIn[id] }; });
  const deps = {};
  ALL_IDS.forEach(id => { deps[id] = new Set(depsIn[id]); });
  const revDeps = {};
  ALL_IDS.forEach(id => { revDeps[id] = new Set(revDepsIn[id]); });

  function computeOne(id) {
    const cell = cells[id];

    // 1. Remove old dependency edges for this cell
    deps[id].forEach(oldInput => {
      revDeps[oldInput] && revDeps[oldInput].delete(id);
    });
    deps[id] = new Set();

    // 2. Plain value (no formula)
    if (!cell.formula) {
      const n = parseFloat(cell.raw);
      cell.computed = isNaN(n) ? cell.raw : n;
      return;
    }

    // 3. Evaluate formula
    const expr = cell.raw.slice(1); // strip '='
    try {
      const { value, refs } = evaluateExpr(expr, refId => {
        const rc = cells[refId];
        if (!rc) return '#REF';
        return rc.computed;
      }, COLS, MAX_ROW);

      // 4. Register new dependency edges
      refs.forEach(ref => {
        deps[id].add(ref);
        if (!revDeps[ref]) revDeps[ref] = new Set();
        revDeps[ref].add(id);
      });

      // 5. Cycle detection after updating edges
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

  // Recompute the changed cell first
  computeOne(startId);

  // Then recompute all transitively-affected cells in BFS order
  const order = downstreamOrder(startId, revDeps);
  order.forEach(id => computeOne(id));

  return { cells, deps, revDeps };
}

// ─── Snapshot helpers for undo/redo ──────────────────────────────────────────

export function takeSnapshot(cells, deps, revDeps, ALL_IDS) {
  return {
    cells: Object.fromEntries(ALL_IDS.map(id => [id, { ...cells[id] }])),
    deps: Object.fromEntries(ALL_IDS.map(id => [id, [...deps[id]]])),
    revDeps: Object.fromEntries(ALL_IDS.map(id => [id, [...revDeps[id]]])),
  };
}

export function restoreSnapshot(snap, ALL_IDS) {
  const cells = Object.fromEntries(ALL_IDS.map(id => [id, { ...snap.cells[id] }]));
  const deps = Object.fromEntries(ALL_IDS.map(id => [id, new Set(snap.deps[id])]));
  const revDeps = Object.fromEntries(ALL_IDS.map(id => [id, new Set(snap.revDeps[id])]));
  return { cells, deps, revDeps };
}
