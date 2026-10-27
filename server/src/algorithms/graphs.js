import { BinaryPriorityQueue } from './heaps.js';

function assertGraphInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('graph must be an object');
  if (!Array.isArray(input.vertices) || !Array.isArray(input.edges)) {
    throw new TypeError('graph.vertices and graph.edges must be arrays');
  }
  if (input.vertices.length > 2000 || input.edges.length > 10000) {
    throw new RangeError('graphs are limited to 2000 vertices and 10000 edges');
  }
  const vertices = input.vertices.slice();
  const index = new Map();
  vertices.forEach((vertex, i) => {
    if (!['string', 'number'].includes(typeof vertex) || (typeof vertex === 'number' && !Number.isFinite(vertex))) {
      throw new TypeError(`vertices[${i}] must be a string or finite number`);
    }
    if (index.has(vertex)) throw new TypeError('graph vertices must be unique');
    index.set(vertex, i);
  });
  const directed = input.directed === undefined ? false : input.directed;
  if (typeof directed !== 'boolean') throw new TypeError('graph.directed must be a boolean');
  const edges = input.edges.map((edge, i) => {
    let from;
    let to;
    let weight = 1;
    if (Array.isArray(edge)) {
      [from, to] = edge;
      if (edge.length > 2) weight = edge[2];
      if (edge.length < 2 || edge.length > 3) throw new TypeError(`edges[${i}] must be [from, to, weight?]`);
    } else if (edge && typeof edge === 'object') {
      ({ from, to } = edge);
      if (edge.weight !== undefined) weight = edge.weight;
    } else throw new TypeError(`edges[${i}] must be an array or object`);
    if (!index.has(from) || !index.has(to)) throw new TypeError(`edges[${i}] references an unknown vertex`);
    if (typeof weight !== 'number' || !Number.isFinite(weight)) throw new TypeError(`edges[${i}].weight must be finite`);
    return { from, to, weight, order: i };
  });
  return { vertices, index, edges, directed };
}

function adjacencyOf(graph) {
  const adjacency = graph.vertices.map(() => []);
  graph.edges.forEach(({ from, to, weight }) => {
    adjacency[graph.index.get(from)].push({ to: graph.index.get(to), weight });
    if (!graph.directed && from !== to) adjacency[graph.index.get(to)].push({ to: graph.index.get(from), weight });
  });
  return adjacency;
}

function requireVertex(graph, vertex, name = 'start') {
  if (!graph.index.has(vertex)) throw new TypeError(`${name} must be a vertex in graph.vertices`);
  return graph.index.get(vertex);
}

function verticesInOrder(graph, indices) {
  return indices.map((i) => graph.vertices[i]);
}

/** Builds deterministic representations in O(V² + E) time and O(V² + E) space. */
export function graphRepresentations(input) {
  const graph = assertGraphInput(input);
  if (graph.vertices.length > 500) throw new RangeError('adjacency matrix output is limited to 500 vertices');
  const adjacencyList = graph.vertices.map((vertex) => ({ vertex, neighbors: [] }));
  const matrix = graph.vertices.map(() => graph.vertices.map(() => null));
  graph.edges.forEach(({ from, to, weight }) => {
    adjacencyList[graph.index.get(from)].neighbors.push({ to, weight });
    const fromIndex = graph.index.get(from);
    const toIndex = graph.index.get(to);
    matrix[fromIndex][toIndex] = matrix[fromIndex][toIndex] === null
      ? weight
      : Math.min(matrix[fromIndex][toIndex], weight);
    if (!graph.directed && from !== to) {
      adjacencyList[graph.index.get(to)].neighbors.push({ to: from, weight });
      matrix[toIndex][fromIndex] = matrix[toIndex][fromIndex] === null
        ? weight
        : Math.min(matrix[toIndex][fromIndex], weight);
    }
  });
  return { vertices: graph.vertices, directed: graph.directed, adjacencyList, adjacencyMatrix: matrix };
}

/** BFS/DFS take O(V + E) time and O(V) auxiliary space. */
export function graphTraversal({ graph: input, start, method = 'bfs' } = {}) {
  const graph = assertGraphInput(input);
  if (!['bfs', 'dfs'].includes(method)) throw new TypeError('method must be bfs or dfs');
  const startIndex = requireVertex(graph, start);
  const adjacency = adjacencyOf(graph);
  const visited = new Set();
  const order = [];
  if (method === 'bfs') {
    visited.add(startIndex);
    const queue = [startIndex];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      order.push(current);
      adjacency[current].forEach(({ to }) => {
        if (!visited.has(to)) {
          visited.add(to);
          queue.push(to);
        }
      });
    }
  } else {
    const stack = [startIndex];
    while (stack.length) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      order.push(current);
      for (let i = adjacency[current].length - 1; i >= 0; i -= 1) {
        const next = adjacency[current][i].to;
        if (!visited.has(next)) stack.push(next);
      }
    }
  }
  return { method, order: verticesInOrder(graph, order) };
}

/** Connected components of an undirected graph: O(V + E) time and O(V) space. */
export function graphComponents(input) {
  const graph = assertGraphInput(input);
  if (graph.directed) throw new TypeError('components requires an undirected graph');
  const adjacency = adjacencyOf(graph);
  const visited = new Set();
  const components = [];
  for (let i = 0; i < graph.vertices.length; i += 1) {
    if (visited.has(i)) continue;
    const component = [];
    const stack = [i];
    visited.add(i);
    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      for (let j = adjacency[current].length - 1; j >= 0; j -= 1) {
        const next = adjacency[current][j].to;
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }
    components.push(verticesInOrder(graph, component));
  }
  return { components, count: components.length };
}

function pathFor(predecessors, source, target) {
  if (source !== target && predecessors[target] === -1) return null;
  const path = [];
  const seen = new Set();
  let current = target;
  while (current !== -1 && !seen.has(current)) {
    seen.add(current);
    path.push(current);
    if (current === source) break;
    current = predecessors[current];
  }
  if (path[path.length - 1] !== source) return null;
  return path.reverse();
}

function pathResults(graph, source, distances, predecessors) {
  return graph.vertices.map((vertex, i) => ({
    vertex,
    distance: Number.isFinite(distances[i]) ? distances[i] : null,
    path: pathFor(predecessors, source, i) === null
      ? null
      : verticesInOrder(graph, pathFor(predecessors, source, i)),
  }));
}

/** Dijkstra distances: O((V + E) log V); path materialization adds O(V²) worst-case. Rejects negatives. */
export function dijkstra({ graph: input, source } = {}) {
  const graph = assertGraphInput(input);
  if (graph.edges.some((edge) => edge.weight < 0)) throw new RangeError('Dijkstra does not accept negative edge weights');
  const start = requireVertex(graph, source, 'source');
  const adjacency = adjacencyOf(graph);
  const distances = graph.vertices.map(() => Infinity);
  const previous = graph.vertices.map(() => -1);
  const settled = new Set();
  distances[start] = 0;
  const queue = new BinaryPriorityQueue();
  queue.enqueue(start, 0);
  while (queue.size) {
    const { value: vertex, priority: distance } = queue.dequeue();
    if (settled.has(vertex)) continue;
    settled.add(vertex);
    adjacency[vertex].forEach(({ to, weight }) => {
      const candidate = distance + weight;
      if (candidate < distances[to]) {
        distances[to] = candidate;
        previous[to] = vertex;
        queue.enqueue(to, candidate);
      }
    });
  }
  return { source, paths: pathResults(graph, start, distances, previous) };
}

/** Bellman-Ford relaxations: O(VE); O(V²) path output worst-case; detects reachable negative cycles. */
export function bellmanFord({ graph: input, source } = {}) {
  const graph = assertGraphInput(input);
  const start = requireVertex(graph, source, 'source');
  const arcs = [];
  graph.edges.forEach(({ from, to, weight }) => {
    arcs.push({ from: graph.index.get(from), to: graph.index.get(to), weight });
    if (!graph.directed && from !== to) arcs.push({ from: graph.index.get(to), to: graph.index.get(from), weight });
  });
  const distances = graph.vertices.map(() => Infinity);
  const previous = graph.vertices.map(() => -1);
  distances[start] = 0;
  for (let i = 1; i < graph.vertices.length; i += 1) {
    let changed = false;
    arcs.forEach(({ from, to, weight }) => {
      if (Number.isFinite(distances[from]) && distances[from] + weight < distances[to]) {
        distances[to] = distances[from] + weight;
        previous[to] = from;
        changed = true;
      }
    });
    if (!changed) break;
  }
  const hasNegativeCycle = arcs.some(({ from, to, weight }) =>
    Number.isFinite(distances[from]) && distances[from] + weight < distances[to]);
  return { source, hasNegativeCycle, paths: pathResults(graph, start, distances, previous) };
}

/** Floyd-Warshall all-pairs shortest paths: O(V³) time and O(V²) space. */
export function floydWarshall(input) {
  const graph = assertGraphInput(input);
  const n = graph.vertices.length;
  if (n > 250) throw new RangeError('Floyd-Warshall is limited to 250 vertices');
  const distance = graph.vertices.map((_, i) => graph.vertices.map((__, j) => (i === j ? 0 : Infinity)));
  graph.edges.forEach(({ from, to, weight }) => {
    const i = graph.index.get(from);
    const j = graph.index.get(to);
    distance[i][j] = Math.min(distance[i][j], weight);
    if (!graph.directed) distance[j][i] = Math.min(distance[j][i], weight);
  });
  for (let k = 0; k < n; k += 1) {
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        if (distance[i][k] + distance[k][j] < distance[i][j]) {
          distance[i][j] = distance[i][k] + distance[k][j];
        }
      }
    }
  }
  return {
    vertices: graph.vertices,
    distances: distance.map((row) => row.map((value) => Number.isFinite(value) ? value : null)),
    hasNegativeCycle: distance.some((row, i) => row[i] < 0),
  };
}

function disjointSets(size) {
  const parent = Array.from({ length: size }, (_, i) => i);
  const rank = Array(size).fill(0);
  const find = (value) => {
    let root = value;
    while (root !== parent[root]) root = parent[root];
    while (value !== root) {
      const next = parent[value];
      parent[value] = root;
      value = next;
    }
    return root;
  };
  const union = (a, b) => {
    let rootA = find(a);
    let rootB = find(b);
    if (rootA === rootB) return false;
    if (rank[rootA] < rank[rootB]) [rootA, rootB] = [rootB, rootA];
    parent[rootB] = rootA;
    if (rank[rootA] === rank[rootB]) rank[rootA] += 1;
    return true;
  };
  return { find, union };
}

function assertUndirectedWeighted(input) {
  const graph = assertGraphInput(input);
  if (graph.directed) throw new TypeError('minimum spanning forest requires an undirected graph');
  return graph;
}

function forestResult(graph, edges) {
  return {
    edges: edges.map(({ from, to, weight }) => ({ from, to, weight })),
    totalWeight: edges.reduce((sum, edge) => sum + edge.weight, 0),
    components: graph.vertices.length - edges.length,
  };
}

/** Kruskal minimum spanning forest: O(E log E) time. */
export function kruskal(input) {
  const graph = assertUndirectedWeighted(input);
  const sets = disjointSets(graph.vertices.length);
  const sorted = graph.edges.slice().sort((a, b) => a.weight - b.weight || a.order - b.order);
  const selected = [];
  sorted.forEach((edge) => {
    const from = graph.index.get(edge.from);
    const to = graph.index.get(edge.to);
    if (sets.union(from, to)) selected.push(edge);
  });
  return forestResult(graph, selected);
}

/** Prim minimum spanning forest: O(E log E) time with deterministic priority ordering. */
export function prim(input) {
  const graph = assertUndirectedWeighted(input);
  const adjacency = adjacencyOf(graph);
  const visited = new Set();
  const selected = [];
  for (let root = 0; root < graph.vertices.length; root += 1) {
    if (visited.has(root)) continue;
    visited.add(root);
    const queue = new BinaryPriorityQueue();
    const pushEdges = (from) => adjacency[from].forEach((edge) => {
      if (!visited.has(edge.to)) {
        queue.enqueue({ from, to: edge.to, weight: edge.weight }, edge.weight);
      }
    });
    pushEdges(root);
    while (queue.size) {
      const { value: edge } = queue.dequeue();
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      selected.push({ from: graph.vertices[edge.from], to: graph.vertices[edge.to], weight: edge.weight });
      pushEdges(edge.to);
    }
  }
  return forestResult(graph, selected);
}

/** Warshall transitive closure: O(V^3) time and O(V^2) space. */
export function transitiveClosure(input) {
  const graph = assertGraphInput(input);
  if (graph.vertices.length > 500) {
    throw new RangeError("transitive closure is limited to 500 vertices");
  }
  const reachable = graph.vertices.map(() => graph.vertices.map(() => false));
  graph.edges.forEach(({ from, to }) => {
    const fromIndex = graph.index.get(from);
    const toIndex = graph.index.get(to);
    reachable[fromIndex][toIndex] = true;
    if (!graph.directed) reachable[toIndex][fromIndex] = true;
  });
  for (let vertex = 0; vertex < graph.vertices.length; vertex += 1) {
    reachable[vertex][vertex] = true;
  }
  for (let via = 0; via < graph.vertices.length; via += 1) {
    for (let from = 0; from < graph.vertices.length; from += 1) {
      if (!reachable[from][via]) continue;
      for (let to = 0; to < graph.vertices.length; to += 1) {
        reachable[from][to] ||= reachable[via][to];
      }
    }
  }
  return { vertices: graph.vertices, reachable };
}
