// ─── Dependency Graph ─────────────────────────────────────────────────────────
// deps[id]    = Set — cells that THIS cell reads from (input dependencies)
// revDeps[id] = Set — cells that read FROM this cell (reverse/output edges)

export function makeGraph(ALL_IDS) {
  const deps = {}, revDeps = {};
  ALL_IDS.forEach(id => { deps[id] = new Set(); revDeps[id] = new Set(); });
  return { deps, revDeps };
}

/**
 * Topological ordering of all cells transitively downstream of `startId`.
 * Uses BFS through revDeps. Excludes startId itself.
 */
export function downstreamOrder(startId, revDeps) {
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

/**
 * DFS-based cycle detection. Returns true if cellId is part of a cycle
 * given the current deps map.
 */
export function hasCycle(startId, deps) {
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
