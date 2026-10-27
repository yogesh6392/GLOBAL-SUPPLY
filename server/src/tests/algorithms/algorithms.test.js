import test from 'node:test';
import assert from 'node:assert/strict';
import {
  algorithmCatalog,
  runAlgorithm,
  BinarySearchTree,
  AVLTree,
  BinaryPriorityQueue,
  graphRepresentations,
  graphTraversal,
  graphComponents,
  dijkstra,
  bellmanFord,
  floydWarshall,
  prim,
  kruskal,
  knapsack01,
  longestCommonSubsequence,
  matrixChainOrder,
  nQueens,
  graphColoring,
  sumSubsets,
  exactTsp,
  RedBlackTree,
  BTree,
  BPlusTree,
  BinomialHeap,
  FibonacciHeap,
  heapComparison,
  threadedTreeOperations,
  transitiveClosure,
  resourceAllocation,
  hamiltonianCycle,
  branchAndBoundTsp,
} from '../../algorithms/index.js';

test('BST and AVL expose deterministic ordered operations', () => {
  const tree = new BinarySearchTree([5, 3, 7, 3, 6]);
  assert.deepEqual(tree.inorder(), [3, 5, 6, 7]);
  assert.equal(tree.search(6), true);
  assert.equal(tree.delete(5), true);
  assert.deepEqual(tree.inorder(), [3, 6, 7]);
  assert.deepEqual(new AVLTree([30, 20, 10, 25, 28]).inorder(), [10, 20, 25, 28, 30]);
  assert.throws(() => tree.insert(Infinity), TypeError);
  assert.deepEqual(threadedTreeOperations({
    values: [8, 3, 10, 1, 6],
    search: [6, 9],
    insert: [4],
  }), {
    inorder: [1, 3, 4, 6, 8, 10],
    searches: [{ value: 6, found: true }, { value: 9, found: false }],
    inserted: [{ value: 4, inserted: true }],
    size: 6,
  });
});

test('heap sort and stable binary priority queue work', () => {
  assert.deepEqual(runAlgorithm('heap.sort', [4, 1, 3, 2]).result, [1, 2, 3, 4]);
  const queue = new BinaryPriorityQueue();
  queue.enqueue('later', 1);
  queue.enqueue('also-later', 1);
  queue.enqueue('first', 0);
  assert.deepEqual(queue.drain().map(({ value }) => value), ['first', 'later', 'also-later']);
});

test('graph representations, traversal, components, and shortest paths', () => {
  const graph = { vertices: ['A', 'B', 'C', 'Z'], edges: [['A', 'B', 2], ['B', 'C', 1]] };
  assert.deepEqual(graphRepresentations(graph).adjacencyMatrix[0][1], 2);
  assert.deepEqual(graphTraversal({ graph, start: 'A', method: 'bfs' }).order, ['A', 'B', 'C']);
  assert.deepEqual(graphTraversal({ graph, start: 'A', method: 'dfs' }).order, ['A', 'B', 'C']);
  assert.deepEqual(graphComponents(graph).components, [['A', 'B', 'C'], ['Z']]);
  assert.deepEqual(dijkstra({ graph, source: 'A' }).paths.map(({ distance }) => distance), [0, 2, 3, null]);
  assert.throws(() => dijkstra({
    graph: { vertices: [0, 1], directed: true, edges: [[0, 1, -1]] },
    source: 0,
  }), /negative/);
  const negativePathGraph = {
    vertices: ['S', 'A', 'B', 'X', 'Y'],
    directed: true,
    edges: [['S', 'A', 1], ['A', 'B', -3], ['B', 'A', 1], ['X', 'Y', -2], ['Y', 'X', 1]],
  };
  assert.equal(bellmanFord({ graph: negativePathGraph, source: 'S' }).hasNegativeCycle, true);
  assert.equal(bellmanFord({
    graph: { vertices: ['S', 'X', 'Y'], directed: true, edges: [['X', 'Y', -2], ['Y', 'X', 1]] },
    source: 'S',
  }).hasNegativeCycle, false);
  assert.deepEqual(floydWarshall({
    vertices: [0, 1, 2],
    directed: true,
    edges: [[0, 1, 3], [1, 2, 4]],
  }).distances, [[0, 3, 7], [null, 0, 4], [null, null, 0]]);
});

test('minimum spanning forests agree on total weight', () => {
  const graph = { vertices: [0, 1, 2, 3], edges: [[0, 1, 4], [0, 2, 1], [2, 1, 2]] };
  assert.equal(prim(graph).totalWeight, 3);
  assert.equal(kruskal(graph).totalWeight, 3);
  assert.equal(prim(graph).components, 2);
  assert.throws(() => kruskal({ ...graph, directed: true }), /undirected/);
});

test('transitive closure computes directed reachability', () => {
  assert.deepEqual(transitiveClosure({
    vertices: ['A', 'B', 'C'],
    directed: true,
    edges: [['A', 'B'], ['B', 'C']],
  }), {
    vertices: ['A', 'B', 'C'],
    reachable: [[true, true, true], [false, true, true], [false, false, true]],
  });
});

test('dynamic programming returns optimal values and witnesses', () => {
  assert.deepEqual(knapsack01({
    items: [{ weight: 2, value: 3 }, { weight: 3, value: 4 }, { weight: 4, value: 5 }],
    capacity: 5,
  }), { maxValue: 7, selectedIndices: [0, 1], totalWeight: 5 });
  const lcs = longestCommonSubsequence({ first: 'ABCBDAB', second: 'BDCABA' });
  assert.equal(lcs.length, 4);
  assert.equal(Array.from(lcs.sequence).length, lcs.length);
  assert.deepEqual(matrixChainOrder({ dimensions: [10, 30, 5, 60] }), {
    minMultiplications: 4500,
    parenthesization: '((A1×A2)×A3)',
  });
  assert.throws(() => knapsack01({ items: [], capacity: 20001 }), RangeError);
  assert.deepEqual(resourceAllocation({
    budget: 5,
    projects: [
      { name: 'Warehouse upgrades', options: [{ resources: 2, value: 5 }, { resources: 4, value: 8 }] },
      { name: 'Fleet capacity', options: [{ resources: 3, value: 6 }, { resources: 5, value: 9 }] },
    ],
  }), {
    maxValue: 11,
    resourcesUsed: 5,
    selected: [
      { project: 'Warehouse upgrades', resources: 2, value: 5, option: null },
      { project: 'Fleet capacity', resources: 3, value: 6, option: null },
    ],
  });
});

test('bounded backtracking algorithms return deterministic witnesses', () => {
  const queens = nQueens({ n: 4 });
  assert.equal(queens.count, 2);
  assert.deepEqual(queens.solutions[0], [2, 4, 1, 3]);
  assert.equal(graphColoring({
    graph: { vertices: [0, 1, 2], edges: [[0, 1], [1, 2]] },
    colors: 2,
  }).count, 2);
  assert.deepEqual(sumSubsets({ values: [2, 3, 5], target: 5 }).solutions.map(({ values }) => values), [[2, 3], [5]]);
  assert.deepEqual(exactTsp({
    vertices: ['A', 'B', 'C'],
    distances: [[0, 2, 5], [2, 0, 1], [5, 1, 0]],
  }), { cost: 8, route: ['A', 'B', 'C', 'A'], routeIndices: [0, 1, 2, 0] });
  assert.throws(() => exactTsp({ vertices: Array(13).fill(0).map((_, i) => i), distances: [] }), RangeError);
  const graph = {
    vertices: ['A', 'B', 'C', 'D'],
    edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ['A', 'C'], ['B', 'D']],
  };
  assert.deepEqual(hamiltonianCycle({ graph, start: 'A' }).cycle, ['A', 'B', 'C', 'D', 'A']);
  const tspInput = {
    vertices: ['A', 'B', 'C'],
    distances: [[0, 2, 5], [2, 0, 1], [5, 1, 0]],
  };
  assert.deepEqual(branchAndBoundTsp(tspInput).cost, 8);
  assert.deepEqual(branchAndBoundTsp({ ...tspInput, maxNodes: 1 }).optimal, false);
});

test('red-black, B-tree, B+ tree, and heap structures preserve order/search', () => {
  const values = [8, 3, 12, 1, 5, 9, 15, 4, 7, 6, 2, 11, 10, 13, 14];
  const sorted = values.slice().sort((a, b) => a - b);
  const redBlack = new RedBlackTree(values);
  assert.equal(redBlack.rootColor(), 'black');
  assert.deepEqual(redBlack.inorder(), sorted);
  assert.equal(redBlack.search(10), true);
  const btree = new BTree(2);
  values.forEach((value) => btree.insert(value));
  assert.deepEqual(btree.inorder(), sorted);
  assert.equal(btree.search(12), true);
  const bplus = new BPlusTree(4);
  values.forEach((value) => bplus.insert(value));
  assert.deepEqual(bplus.values(), sorted);
  assert.deepEqual(bplus.range(5, 11), [5, 6, 7, 8, 9, 10, 11]);
  assert.equal(bplus.search(13), true);
  assert.deepEqual(new BinomialHeap(values).drain(), sorted);
  assert.deepEqual(new FibonacciHeap(values).drain(), sorted);
  assert.deepEqual(heapComparison({ values }).binomial.extractedAscending, sorted);
  assert.deepEqual(heapComparison({ values }).fibonacci.extractedAscending, sorted);
  assert.equal(heapComparison({ values }).benchmark.outputsMatch, true);
});

test('catalog is serializable and dispatcher returns metadata envelope', () => {
  assert.equal(Object.keys(algorithmCatalog).length, 28);
  const answer = runAlgorithm('dp.knapsack01', algorithmCatalog['dp.knapsack01'].sampleInput);
  assert.equal(answer.algorithm, 'dp.knapsack01');
  assert.equal(answer.unit, 'unit-3');
  assert.equal(answer.result.maxValue, 4);
  assert.throws(() => runAlgorithm('not-an-algorithm', {}), RangeError);
});
