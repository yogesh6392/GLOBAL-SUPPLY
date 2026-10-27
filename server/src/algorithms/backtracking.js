import { graphRepresentations } from './graphs.js';

const MAX_SOLUTIONS = 1000;
const MAX_SEARCH_NODES = 2_000_000;

function safePositiveInteger(value, name, maximum) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new RangeError(`${name} must be an integer from 0 to ${maximum}`);
  }
}

/**
 * N-queens backtracking. Exponential worst-case; n is capped at 14 and output
 * at 1,000 boards. Returns 1-based column positions for each row.
 */
export function nQueens({ n, maxSolutions = MAX_SOLUTIONS } = {}) {
  safePositiveInteger(n, 'n', 14);
  safePositiveInteger(maxSolutions, 'maxSolutions', MAX_SOLUTIONS);
  if (maxSolutions === 0) throw new RangeError('maxSolutions must be at least 1');
  const solutions = [];
  const columns = [];
  let nodesVisited = 0;
  let truncated = false;
  const search = (row, usedColumns, descending, ascending) => {
    if (solutions.length >= maxSolutions || nodesVisited >= MAX_SEARCH_NODES) {
      truncated = true;
      return;
    }
    nodesVisited += 1;
    if (row === n) {
      solutions.push(columns.slice());
      return;
    }
    for (let column = 0; column < n; column += 1) {
      const down = row - column;
      const up = row + column;
      if (usedColumns.has(column) || descending.has(down) || ascending.has(up)) continue;
      columns.push(column + 1);
      usedColumns.add(column);
      descending.add(down);
      ascending.add(up);
      search(row + 1, usedColumns, descending, ascending);
      columns.pop();
      usedColumns.delete(column);
      descending.delete(down);
      ascending.delete(up);
      if (truncated) return;
    }
  };
  search(0, new Set(), new Set(), new Set());
  return { solutions, count: solutions.length, truncated, nodesVisited };
}

/**
 * Enumerates proper colorings with bounded output/search. O(k^V) worst-case.
 * A deterministic vertex order and ascending color choices stabilize results.
 */
export function graphColoring({ graph, colors, maxSolutions = MAX_SOLUTIONS } = {}) {
  safePositiveInteger(colors, 'colors', 20);
  if (colors === 0) throw new RangeError('colors must be at least 1');
  safePositiveInteger(maxSolutions, 'maxSolutions', MAX_SOLUTIONS);
  if (maxSolutions === 0) throw new RangeError('maxSolutions must be at least 1');
  const representation = graphRepresentations(graph);
  const vertices = representation.vertices;
  if (vertices.length > 20) throw new RangeError('graph coloring is limited to 20 vertices');
  const matrix = representation.adjacencyMatrix;
  const assignments = Array(vertices.length).fill(0);
  const solutions = [];
  let nodesVisited = 0;
  let truncated = false;
  const search = (vertex) => {
    if (solutions.length >= maxSolutions || nodesVisited >= MAX_SEARCH_NODES) {
      truncated = true;
      return;
    }
    nodesVisited += 1;
    if (vertex === vertices.length) {
      solutions.push(assignments.slice());
      return;
    }
    for (let color = 1; color <= colors; color += 1) {
      let valid = true;
      for (let neighbor = 0; neighbor < vertices.length; neighbor += 1) {
        if (matrix[vertex][neighbor] !== null && assignments[neighbor] === color) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;
      assignments[vertex] = color;
      search(vertex + 1);
      assignments[vertex] = 0;
      if (truncated) return;
    }
  };
  search(0);
  return {
    solutions: solutions.map((solution) => vertices.map((vertex, i) => ({ vertex, color: solution[i] }))),
    count: solutions.length,
    truncated,
    nodesVisited,
  };
}

/**
 * Enumerates subsets summing to target. O(2^n) worst-case; n <= 24 and both
 * returned solutions and visited recursive states are bounded.
 */
export function sumSubsets({ values, target, maxSolutions = MAX_SOLUTIONS } = {}) {
  if (!Array.isArray(values)) throw new TypeError('values must be an array');
  if (values.length > 24) throw new RangeError('sum subsets is limited to 24 values');
  values.forEach((value, index) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`values[${index}] must be finite`);
  });
  if (typeof target !== 'number' || !Number.isFinite(target)) throw new TypeError('target must be finite');
  safePositiveInteger(maxSolutions, 'maxSolutions', MAX_SOLUTIONS);
  if (maxSolutions === 0) throw new RangeError('maxSolutions must be at least 1');
  const solutions = [];
  const selected = [];
  let nodesVisited = 0;
  let truncated = false;
  const search = (index, sum) => {
    if (solutions.length >= maxSolutions || nodesVisited >= MAX_SEARCH_NODES) {
      truncated = true;
      return;
    }
    nodesVisited += 1;
    if (index === values.length) {
      if (sum === target) solutions.push(selected.slice());
      return;
    }
    selected.push(index);
    search(index + 1, sum + values[index]);
    selected.pop();
    if (truncated) return;
    search(index + 1, sum);
  };
  search(0, 0);
  return {
    solutions: solutions.map((indices) => ({ indices, values: indices.map((index) => values[index]) })),
    count: solutions.length,
    truncated,
    nodesVisited,
  };
}

/**
 * Exact symmetric TSP using subset dynamic programming. O(n²2^n) time and
 * O(n2^n) space; n is capped at 12. Matrix entries null mean no edge.
 */
export function exactTsp({ vertices, distances, start = 0 } = {}) {
  if (!Array.isArray(vertices) || !Array.isArray(distances)) {
    throw new TypeError('vertices and distances must be arrays');
  }
  const n = vertices.length;
  if (n < 1 || n > 12) throw new RangeError('exact TSP requires 1 to 12 vertices');
  if (vertices.some((vertex) => !['string', 'number'].includes(typeof vertex)
    || (typeof vertex === 'number' && !Number.isFinite(vertex)))) {
    throw new TypeError('vertices must be strings or finite numbers');
  }
  if (new Set(vertices).size !== n) throw new TypeError('vertices must be unique');
  if (!Number.isSafeInteger(start) || start < 0 || start >= n) throw new RangeError('start must be a valid vertex index');
  if (distances.length !== n || distances.some((row) => !Array.isArray(row) || row.length !== n)) {
    throw new TypeError('distances must be a square n by n matrix');
  }
  distances.forEach((row, i) => row.forEach((value, j) => {
    if (i === j && (value === null || value === undefined)) return;
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      throw new TypeError('distance entries must be null or finite non-negative numbers');
    }
  }));
  if (n === 1) return { cost: 0, route: [vertices[start], vertices[start]], routeIndices: [start, start] };
  const fullMask = (1 << n) - 1;
  const memo = new Map();
  const solve = (mask, current) => {
    if (mask === fullMask) {
      const returnCost = distances[current][start];
      return returnCost === null ? { cost: Infinity, next: -1 } : { cost: returnCost, next: start };
    }
    const key = `${mask},${current}`;
    if (memo.has(key)) return memo.get(key);
    let best = { cost: Infinity, next: -1 };
    for (let next = 0; next < n; next += 1) {
      if ((mask & (1 << next)) !== 0 || distances[current][next] === null) continue;
      const remainder = solve(mask | (1 << next), next);
      const candidate = distances[current][next] + remainder.cost;
      if (candidate < best.cost) best = { cost: candidate, next };
    }
    memo.set(key, best);
    return best;
  };
  const initialMask = 1 << start;
  const answer = solve(initialMask, start);
  if (!Number.isFinite(answer.cost)) return { cost: null, route: null };
  const route = [start];
  let mask = initialMask;
  let current = start;
  while (mask !== fullMask) {
    const next = solve(mask, current).next;
    if (next < 0) return { cost: null, route: null };
    route.push(next);
    mask |= 1 << next;
    current = next;
  }
  route.push(start);
  return { cost: answer.cost, route: route.map((index) => vertices[index]), routeIndices: route };
}

/**
 * Bounded Hamiltonian-cycle search. O(V!) worst case; at most 12 vertices
 * and 2,000,000 search states.
 */
export function hamiltonianCycle({ graph, start, maxNodes = MAX_SEARCH_NODES } = {}) {
  const representation = graphRepresentations(graph);
  const vertices = representation.vertices;
  const n = vertices.length;
  if (n > 12) throw new RangeError("Hamiltonian cycle search is limited to 12 vertices");
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > MAX_SEARCH_NODES) {
    throw new RangeError(`maxNodes must be an integer from 1 to ${MAX_SEARCH_NODES}`);
  }
  const startIndex = vertices.indexOf(start ?? vertices[0]);
  if (startIndex < 0) throw new RangeError("start must be a vertex in the graph");
  const route = [startIndex];
  const visited = new Set(route);
  let nodesVisited = 0;
  let truncated = false;

  function search(current) {
    if (nodesVisited >= maxNodes) {
      truncated = true;
      return false;
    }
    nodesVisited += 1;
    if (route.length === n) {
      if (representation.adjacencyMatrix[current][startIndex] === null) return false;
      route.push(startIndex);
      return true;
    }
    for (let next = 0; next < n; next += 1) {
      if (visited.has(next) || representation.adjacencyMatrix[current][next] === null) continue;
      visited.add(next);
      route.push(next);
      if (search(next)) return true;
      route.pop();
      visited.delete(next);
      if (truncated) break;
    }
    return false;
  }

  const found = search(startIndex);
  return {
    cycle: found ? route.map((index) => vertices[index]) : null,
    found,
    complete: !truncated,
    nodesVisited
  };
}

/**
 * Exact branch-and-bound TSP with an admissible outgoing-edge lower bound.
 * O(V!) worst case; vertices <= 12, bounded at 2,000,000 states.
 */
export function branchAndBoundTsp({ vertices, distances, start = 0, maxNodes = MAX_SEARCH_NODES } = {}) {
  if (!Array.isArray(vertices) || !Array.isArray(distances)) {
    throw new TypeError("vertices and distances must be arrays");
  }
  const n = vertices.length;
  if (n < 1 || n > 12) throw new RangeError("branch-and-bound TSP requires 1 to 12 vertices");
  if (vertices.some((vertex) => !["string", "number"].includes(typeof vertex)
    || (typeof vertex === "number" && !Number.isFinite(vertex)))) {
    throw new TypeError("vertices must be strings or finite numbers");
  }
  if (new Set(vertices).size !== n) throw new TypeError("vertices must be unique");
  if (!Number.isSafeInteger(start) || start < 0 || start >= n) {
    throw new RangeError("start must be a valid vertex index");
  }
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > MAX_SEARCH_NODES) {
    throw new RangeError(`maxNodes must be an integer from 1 to ${MAX_SEARCH_NODES}`);
  }
  if (distances.length !== n || distances.some((row) => !Array.isArray(row) || row.length !== n)) {
    throw new TypeError("distances must be a square n by n matrix");
  }
  distances.forEach((row, i) => row.forEach((value, j) => {
    if (i === j && (value === null || value === undefined)) return;
    if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
      throw new TypeError("distance entries must be null or finite non-negative numbers");
    }
  }));
  if (n === 1) {
    return { cost: 0, route: [vertices[start], vertices[start]], nodesVisited: 1, optimal: true, truncated: false };
  }

  const route = [start];
  const visited = new Set(route);
  let bestCost = Infinity;
  let bestRoute = null;
  let nodesVisited = 0;
  let truncated = false;

  function lowerBound(current, cost) {
    let bound = cost;
    const targets = [...Array(n).keys()].filter((vertex) => !visited.has(vertex));
    const outgoingFromCurrent = targets.length
      ? targets.map((vertex) => distances[current][vertex]).filter((weight) => weight !== null)
      : [distances[current][start]].filter((weight) => weight !== null);
    if (!outgoingFromCurrent.length) return Infinity;
    bound += Math.min(...outgoingFromCurrent);
    for (const vertex of targets) {
      const destinations = targets.filter((destination) => destination !== vertex);
      destinations.push(start);
      const outgoing = destinations
        .map((destination) => distances[vertex][destination])
        .filter((weight) => weight !== null);
      if (!outgoing.length) return Infinity;
      bound += Math.min(...outgoing);
    }
    return bound;
  }

  function search(current, cost) {
    if (nodesVisited >= maxNodes) {
      truncated = true;
      return;
    }
    nodesVisited += 1;
    if (lowerBound(current, cost) >= bestCost) return;
    if (route.length === n) {
      const returnCost = distances[current][start];
      if (returnCost !== null && cost + returnCost < bestCost) {
        bestCost = cost + returnCost;
        bestRoute = [...route, start];
      }
      return;
    }
    const nextOptions = [...Array(n).keys()]
      .filter((next) => !visited.has(next) && distances[current][next] !== null)
      .sort((left, right) => distances[current][left] - distances[current][right]);
    for (const next of nextOptions) {
      visited.add(next);
      route.push(next);
      search(next, cost + distances[current][next]);
      route.pop();
      visited.delete(next);
      if (truncated) return;
    }
  }

  search(start, 0);
  return {
    cost: bestRoute ? bestCost : null,
    route: bestRoute ? bestRoute.map((index) => vertices[index]) : null,
    nodesVisited,
    optimal: !truncated,
    truncated
  };
}
