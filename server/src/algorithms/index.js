import { bstOperations, avlOperations } from './trees.js';
import { heapSort, priorityQueueOperations } from './heaps.js';
import {
  graphRepresentations,
  graphTraversal,
  graphComponents,
  dijkstra,
  bellmanFord,
  floydWarshall,
  prim,
  kruskal,
  transitiveClosure,
} from './graphs.js';
import { knapsack01, longestCommonSubsequence, matrixChainOrder, resourceAllocation } from './dynamicProgramming.js';
import {
  nQueens,
  graphColoring,
  sumSubsets,
  exactTsp,
  hamiltonianCycle,
  branchAndBoundTsp,
} from './backtracking.js';
import { threadedTreeOperations } from './threadedTrees.js';
import {
  redBlackOperations,
  bTreeOperations,
  bPlusTreeOperations,
  heapComparison,
} from './advancedStructures.js';

const definitions = {
  'tree.bst': {
    unit: 'unit-1',
    description: 'Binary search tree traversals, search, insertion, and deletion.',
    complexity: 'Expected O(log n) per operation; worst-case O(n); traversals O(n).',
    sampleInput: { values: [8, 3, 10, 1], search: [3, 7], insert: [6], delete: [10] },
    resultShape: '{ traversals: { inorder, preorder, postorder, levelorder }, searches, inserted, deleted, size }',
    run: bstOperations,
  },
  'tree.avl': {
    unit: 'unit-1',
    description: 'AVL insertion, balance maintenance, inorder traversal, and search.',
    complexity: 'O(log n) per insert/search; O(n) traversal.',
    sampleInput: { values: [30, 20, 10, 25], search: [20, 99] },
    resultShape: '{ inorder, searches, size, height }',
    run: avlOperations,
  },
  'tree.threaded': {
    unit: 'unit-1',
    description: 'Right-threaded BST insertion, search, and inorder traversal using successor threads.',
    complexity: 'Search O(h); thread-aware insertion O(n) to refresh links; traversal O(n) without recursion or a traversal stack.',
    sampleInput: { values: [8, 3, 10, 1, 6], search: [6, 9], insert: [4] },
    resultShape: '{ inorder, searches, inserted, size }',
    run: threadedTreeOperations,
  },
  'heap.sort': {
    unit: 'unit-1',
    description: 'In-place-style max-heap sort returning a sorted copy.',
    complexity: 'O(n log n) time; O(n) output copy (O(1) algorithm workspace).',
    sampleInput: [5, 1, 4, 2],
    resultShape: 'number[] in ascending order',
    run: heapSort,
  },
  'heap.priorityQueue': {
    unit: 'unit-1',
    description: 'Binary min-priority queue with stable tie ordering.',
    complexity: 'enqueue/dequeue O(log n); peek O(1).',
    sampleInput: { entries: [{ value: 'later', priority: 5 }], operations: [{ type: 'enqueue', value: 'first', priority: 1 }, { type: 'dequeue' }] },
    resultShape: '{ results: operationResult[], remaining: { value, priority }[] }',
    run: priorityQueueOperations,
  },
  'graph.representations': {
    unit: 'unit-2',
    description: 'Build adjacency-list and adjacency-matrix representations.',
    complexity: 'O(V + E) list construction and O(V²) matrix space.',
    sampleInput: { vertices: ['A', 'B'], edges: [['A', 'B', 3]] },
    resultShape: '{ vertices, directed, adjacencyList: [{ vertex, neighbors }], adjacencyMatrix }',
    run: graphRepresentations,
  },
  'graph.traversal': {
    unit: 'unit-2',
    description: 'Breadth-first or depth-first traversal from a selected vertex.',
    complexity: 'O(V + E) time and O(V) space.',
    sampleInput: { graph: { vertices: ['A', 'B', 'C'], edges: [['A', 'B'], ['A', 'C']] }, start: 'A', method: 'bfs' },
    resultShape: '{ method, order: vertex[] }',
    run: graphTraversal,
  },
  'graph.components': {
    unit: 'unit-2',
    description: 'Connected components of an undirected graph.',
    complexity: 'O(V + E) time and O(V) space.',
    sampleInput: { vertices: [1, 2, 3], edges: [[1, 2]] },
    resultShape: '{ components: vertex[][], count }',
    run: graphComponents,
  },
  'graph.dijkstra': {
    unit: 'unit-2',
    description: 'Single-source shortest paths for non-negative weighted edges.',
    complexity: 'O((V + E) log V) distances plus O(V²) worst-case path output; rejects negative weights.',
    sampleInput: { graph: { vertices: ['A', 'B', 'C'], edges: [['A', 'B', 2], ['B', 'C', 4]] }, source: 'A' },
    resultShape: '{ source, paths: [{ vertex, distance, path }] }',
    run: dijkstra,
  },
  'graph.bellmanFord': {
    unit: 'unit-2',
    description: 'Single-source shortest paths and reachable negative-cycle detection.',
    complexity: 'O(VE) relaxations plus O(V²) worst-case path output; detects reachable negative cycles.',
    sampleInput: { graph: { vertices: ['S', 'T'], directed: true, edges: [['S', 'T', -2]] }, source: 'S' },
    resultShape: '{ source, hasNegativeCycle, paths: [{ vertex, distance, path }] }',
    run: bellmanFord,
  },
  'graph.floydWarshall': {
    unit: 'unit-2',
    description: 'All-pairs shortest paths.',
    complexity: 'O(V³) time and O(V²) space.',
    sampleInput: { vertices: ['A', 'B'], directed: true, edges: [['A', 'B', 2]] },
    resultShape: '{ vertices, distances: number|null[][], hasNegativeCycle }',
    run: floydWarshall,
  },
  'graph.prim': {
    unit: 'unit-2',
    description: 'Prim minimum spanning forest for an undirected weighted graph.',
    complexity: 'O(E log E) using a binary priority queue.',
    sampleInput: { vertices: [0, 1, 2], edges: [[0, 1, 2], [1, 2, 1], [0, 2, 4]] },
    resultShape: '{ edges: [{ from, to, weight }], totalWeight, components }',
    run: prim,
  },
  'graph.kruskal': {
    unit: 'unit-2',
    description: 'Kruskal minimum spanning forest for an undirected weighted graph.',
    complexity: 'O(E log E) time.',
    sampleInput: { vertices: [0, 1, 2], edges: [[0, 1, 2], [1, 2, 1], [0, 2, 4]] },
    resultShape: '{ edges: [{ from, to, weight }], totalWeight, components }',
    run: kruskal,
  },
  'graph.transitiveClosure': {
    unit: 'unit-2',
    description: 'Warshall transitive closure for directed reachability and network connectivity.',
    complexity: 'O(V³) time and O(V²) space; at most 500 vertices.',
    sampleInput: { vertices: ['A', 'B', 'C'], directed: true, edges: [['A', 'B'], ['B', 'C']] },
    resultShape: '{ vertices, reachable: boolean[][] }',
    run: transitiveClosure,
  },
  'dp.knapsack01': {
    unit: 'unit-3',
    description: '0/1 knapsack with selected item indices.',
    complexity: 'O(nW) time and space; capacity <= 20,000 and table <= 2,000,000 cells.',
    sampleInput: { items: [{ weight: 2, value: 3 }, { weight: 3, value: 4 }], capacity: 3 },
    resultShape: '{ maxValue, selectedIndices, totalWeight }',
    run: knapsack01,
  },
  'dp.lcs': {
    unit: 'unit-3',
    description: 'Longest common subsequence with deterministic sequence reconstruction.',
    complexity: 'O(mn) time and space; each input <= 1,000 code points.',
    sampleInput: { first: 'ABCBDAB', second: 'BDCABA' },
    resultShape: '{ length, sequence }',
    run: longestCommonSubsequence,
  },
  'dp.matrixChain': {
    unit: 'unit-3',
    description: 'Optimal parenthesization for a chain of matrices.',
    complexity: 'O(n³) time and O(n²) space; at most 100 matrices.',
    sampleInput: { dimensions: [10, 30, 5, 60] },
    resultShape: '{ minMultiplications, parenthesization }',
    run: matrixChainOrder,
  },
  'dp.resourceAllocation': {
    unit: 'unit-3',
    description: 'Choose one resource option per project to maximize value under an explicit budget.',
    complexity: 'O(P*B*O) time and O(P*B) space; budget <= 20,000; at most 100 options per project.',
    sampleInput: {
      budget: 5,
      projects: [
        { name: 'Warehouse upgrades', options: [{ resources: 2, value: 5 }, { resources: 4, value: 8 }] },
        { name: 'Fleet capacity', options: [{ resources: 3, value: 6 }, { resources: 5, value: 9 }] },
      ],
    },
    resultShape: '{ maxValue, resourcesUsed, selected: [{ project, resources, value, option }] }',
    run: resourceAllocation,
  },
  'backtracking.nQueens': {
    unit: 'unit-4',
    description: 'Enumerate n-queens placements.',
    complexity: 'Exponential worst-case; n <= 14, <= 1,000 solutions and 2,000,000 search states.',
    sampleInput: { n: 4 },
    resultShape: '{ solutions: number[][], count, truncated, nodesVisited }',
    run: nQueens,
  },
  'backtracking.graphColoring': {
    unit: 'unit-4',
    description: 'Enumerate proper color assignments.',
    complexity: 'O(k^V) worst-case; V <= 20, bounded solution/search counts.',
    sampleInput: { graph: { vertices: [0, 1, 2], edges: [[0, 1], [1, 2]] }, colors: 2 },
    resultShape: '{ solutions: { vertex, color }[][], count, truncated, nodesVisited }',
    run: graphColoring,
  },
  'backtracking.sumSubsets': {
    unit: 'unit-4',
    description: 'Enumerate index-distinct subsets that sum to a target.',
    complexity: 'O(2^n) worst-case; n <= 24, bounded solution/search counts.',
    sampleInput: { values: [2, 3, 5], target: 5 },
    resultShape: '{ solutions: { indices, values }[], count, truncated, nodesVisited }',
    run: sumSubsets,
  },
  'backtracking.exactTsp': {
    unit: 'unit-4',
    description: 'Exact minimum Hamiltonian tour by subset dynamic programming.',
    complexity: 'O(n²2^n) time and O(n2^n) space; n <= 12.',
    sampleInput: { vertices: ['A', 'B', 'C'], distances: [[0, 2, 5], [2, 0, 1], [5, 1, 0]] },
    resultShape: '{ cost: number|null, route: vertex[]|null, routeIndices?: number[] }',
    run: exactTsp,
  },
  'backtracking.hamiltonianCycle': {
    unit: 'unit-4',
    description: 'Find one Hamiltonian cycle through all vertices using bounded backtracking.',
    complexity: 'O(V!) worst case; at most 12 vertices and 2,000,000 search states.',
    sampleInput: { graph: { vertices: ['A', 'B', 'C', 'D'], edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ['A', 'C'], ['B', 'D']] }, start: 'A' },
    resultShape: '{ cycle: vertex[]|null, found, complete, nodesVisited }',
    run: hamiltonianCycle,
  },
  'backtracking.branchBoundTsp': {
    unit: 'unit-4',
    description: 'Exact TSP search with an admissible outgoing-edge lower bound and branch pruning.',
    complexity: 'O(V!) worst case; at most 12 vertices and 2,000,000 search states.',
    sampleInput: { vertices: ['A', 'B', 'C'], distances: [[0, 2, 5], [2, 0, 1], [5, 1, 0]] },
    resultShape: '{ cost: number|null, route: vertex[]|null, nodesVisited, optimal, truncated }',
    run: branchAndBoundTsp,
  },
  'advanced.redBlackTree': {
    unit: 'unit-5',
    description: 'Red-black insertion, search, and inorder traversal.',
    complexity: 'O(log n) per insert/search; O(n) traversal.',
    sampleInput: { values: [7, 3, 9, 1], search: [9, 4] },
    resultShape: '{ inorder, searches, size, rootColor }',
    run: redBlackOperations,
  },
  'advanced.bTree': {
    unit: 'unit-5',
    description: 'Demonstrative B-tree insertion, search, and traversal.',
    complexity: 'O(log n) insert/search for fixed minimum degree; O(n) traversal.',
    sampleInput: { values: [8, 3, 12, 1, 5], search: [5, 7], minDegree: 2 },
    resultShape: '{ inorder, searches, size }',
    run: bTreeOperations,
  },
  'advanced.bPlusTree': {
    unit: 'unit-5',
    description: 'B+ tree insertion, search, and linked-leaf range scan.',
    complexity: 'O(log n) insert/search; O(log n + k) range scan for fixed order.',
    sampleInput: { values: [8, 3, 12, 1, 5], search: [5], range: [3, 8], order: 4 },
    resultShape: '{ values, searches, size, range? }',
    run: bPlusTreeOperations,
  },
  'advanced.heapComparison': {
    unit: 'unit-5',
    description: 'Compare binomial and Fibonacci heap core insert/minimum/extract operations.',
    complexity: 'Binomial insert/extract O(log n); Fibonacci insert amortized O(1), extract amortized O(log n).',
    sampleInput: { values: [9, 2, 7, 1] },
    resultShape: '{ inputSize, binomial: { minimum, extractedAscending }, fibonacci: { minimum, extractedAscending }, operations }',
    run: heapComparison,
  },
};

/** JSON-friendly catalog metadata, sample inputs, result shapes, and complexity summaries. */
export const algorithmCatalog = Object.freeze(Object.fromEntries(
  Object.entries(definitions).map(([id, definition]) => [id, Object.freeze({
    unit: definition.unit,
    description: definition.description,
    complexity: definition.complexity,
    sampleInput: definition.sampleInput,
    resultShape: definition.resultShape,
  })]),
));

/**
 * Dispatches a validated algorithm ID and returns a stable envelope containing
 * the documented unit, complexity, and algorithm-specific result.
 */
export function runAlgorithm(id, input) {
  if (typeof id !== 'string' || !Object.hasOwn(definitions, id)) {
    throw new RangeError(`Unknown algorithm "${id}". See algorithmCatalog for supported IDs.`);
  }
  const definition = definitions[id];
  if (id === 'heap.sort') {
    if (!Array.isArray(input)) throw new TypeError('heap.sort input must be an array');
  } else if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('algorithm input must be an object');
  }
  const result = definition.run(input);
  return { algorithm: id, unit: definition.unit, complexity: definition.complexity, result };
}

export {
  bstOperations,
  avlOperations,
  heapSort,
  priorityQueueOperations,
  graphRepresentations,
  graphTraversal,
  graphComponents,
  dijkstra,
  bellmanFord,
  floydWarshall,
  prim,
  kruskal,
  transitiveClosure,
  knapsack01,
  longestCommonSubsequence,
  matrixChainOrder,
  resourceAllocation,
  nQueens,
  graphColoring,
  sumSubsets,
  exactTsp,
  hamiltonianCycle,
  branchAndBoundTsp,
  redBlackOperations,
  bTreeOperations,
  bPlusTreeOperations,
  heapComparison,
};
export {
  BinarySearchTree,
  AVLTree,
} from './trees.js';
export {
  BinaryPriorityQueue,
} from './heaps.js';
export {
  RedBlackTree,
  BTree,
  BPlusTree,
  BinomialHeap,
  FibonacciHeap,
  advancedStructureCatalog,
} from './advancedStructures.js';
export {
  ThreadedBinarySearchTree,
  threadedTreeOperations,
} from './threadedTrees.js';
