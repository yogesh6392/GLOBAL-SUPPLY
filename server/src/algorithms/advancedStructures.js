function assertNumber(value, name = 'value') {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
}

function assertValues(values) {
  if (!Array.isArray(values)) throw new TypeError('values must be an array');
  values.forEach((value, index) => assertNumber(value, `values[${index}]`));
}

/** Red-black insertion/search: O(log n); inorder traversal: O(n). Duplicates are ignored. */
export class RedBlackTree {
  constructor(values = []) {
    assertValues(values);
    this.nil = { color: 'black', left: null, right: null, parent: null };
    this.nil.left = this.nil;
    this.nil.right = this.nil;
    this.nil.parent = this.nil;
    this.root = this.nil;
    this.size = 0;
    values.forEach((value) => this.insert(value));
  }

  _rotateLeft(node) {
    const pivot = node.right;
    node.right = pivot.left;
    if (pivot.left !== this.nil) pivot.left.parent = node;
    pivot.parent = node.parent;
    if (node.parent === this.nil) this.root = pivot;
    else if (node === node.parent.left) node.parent.left = pivot;
    else node.parent.right = pivot;
    pivot.left = node;
    node.parent = pivot;
  }

  _rotateRight(node) {
    const pivot = node.left;
    node.left = pivot.right;
    if (pivot.right !== this.nil) pivot.right.parent = node;
    pivot.parent = node.parent;
    if (node.parent === this.nil) this.root = pivot;
    else if (node === node.parent.right) node.parent.right = pivot;
    else node.parent.left = pivot;
    pivot.right = node;
    node.parent = pivot;
  }

  insert(value) {
    assertNumber(value);
    let parent = this.nil;
    let current = this.root;
    while (current !== this.nil) {
      parent = current;
      if (value === current.value) return false;
      current = value < current.value ? current.left : current.right;
    }
    const node = { value, color: 'red', left: this.nil, right: this.nil, parent };
    if (parent === this.nil) this.root = node;
    else if (value < parent.value) parent.left = node;
    else parent.right = node;
    this.size += 1;
    this._fixInsert(node);
    return true;
  }

  _fixInsert(node) {
    while (node.parent.color === 'red') {
      if (node.parent === node.parent.parent.left) {
        const uncle = node.parent.parent.right;
        if (uncle.color === 'red') {
          node.parent.color = 'black';
          uncle.color = 'black';
          node.parent.parent.color = 'red';
          node = node.parent.parent;
        } else {
          if (node === node.parent.right) {
            node = node.parent;
            this._rotateLeft(node);
          }
          node.parent.color = 'black';
          node.parent.parent.color = 'red';
          this._rotateRight(node.parent.parent);
        }
      } else {
        const uncle = node.parent.parent.left;
        if (uncle.color === 'red') {
          node.parent.color = 'black';
          uncle.color = 'black';
          node.parent.parent.color = 'red';
          node = node.parent.parent;
        } else {
          if (node === node.parent.left) {
            node = node.parent;
            this._rotateRight(node);
          }
          node.parent.color = 'black';
          node.parent.parent.color = 'red';
          this._rotateLeft(node.parent.parent);
        }
      }
    }
    this.root.color = 'black';
    this.root.parent = this.nil;
  }

  search(value) {
    assertNumber(value);
    let node = this.root;
    while (node !== this.nil) {
      if (node.value === value) return true;
      node = value < node.value ? node.left : node.right;
    }
    return false;
  }

  inorder() {
    const result = [];
    const walk = (node) => {
      if (node === this.nil) return;
      walk(node.left);
      result.push(node.value);
      walk(node.right);
    };
    walk(this.root);
    return result;
  }

  rootColor() {
    return this.root === this.nil ? null : this.root.color;
  }
}

export function redBlackOperations(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const { values = [], search = [] } = input;
  assertValues(values);
  assertValues(search);
  const tree = new RedBlackTree(values);
  return {
    inorder: tree.inorder(),
    searches: search.map((value) => ({ value, found: tree.search(value) })),
    size: tree.size,
    rootColor: tree.rootColor(),
  };
}

class BTreeNode {
  constructor(leaf) {
    this.leaf = leaf;
    this.keys = [];
    this.children = [];
  }
}

/**
 * Demonstrative B-tree with minimum degree t (2 <= t <= 16).
 * Search/insert are O(log n) for fixed t; sorted traversal is O(n).
 */
export class BTree {
  constructor(minDegree = 2) {
    if (!Number.isSafeInteger(minDegree) || minDegree < 2 || minDegree > 16) {
      throw new RangeError('minDegree must be an integer from 2 to 16');
    }
    this.minDegree = minDegree;
    this.root = new BTreeNode(true);
    this.size = 0;
  }

  search(value) {
    assertNumber(value);
    let node = this.root;
    while (true) {
      let index = 0;
      while (index < node.keys.length && value > node.keys[index]) index += 1;
      if (node.keys[index] === value) return true;
      if (node.leaf) return false;
      node = node.children[index];
    }
  }

  insert(value) {
    assertNumber(value);
    if (this.search(value)) return false;
    const maxKeys = 2 * this.minDegree - 1;
    if (this.root.keys.length === maxKeys) {
      const newRoot = new BTreeNode(false);
      newRoot.children.push(this.root);
      this._splitChild(newRoot, 0);
      this.root = newRoot;
    }
    this._insertNonFull(this.root, value);
    this.size += 1;
    return true;
  }

  _splitChild(parent, index) {
    const degree = this.minDegree;
    const full = parent.children[index];
    const right = new BTreeNode(full.leaf);
    const median = full.keys[degree - 1];
    right.keys = full.keys.slice(degree);
    full.keys = full.keys.slice(0, degree - 1);
    if (!full.leaf) {
      right.children = full.children.slice(degree);
      full.children = full.children.slice(0, degree);
    }
    parent.keys.splice(index, 0, median);
    parent.children.splice(index + 1, 0, right);
  }

  _insertNonFull(node, value) {
    let index = node.keys.length - 1;
    if (node.leaf) {
      node.keys.push(0);
      while (index >= 0 && value < node.keys[index]) {
        node.keys[index + 1] = node.keys[index];
        index -= 1;
      }
      node.keys[index + 1] = value;
      return;
    }
    while (index >= 0 && value < node.keys[index]) index -= 1;
    index += 1;
    if (node.children[index].keys.length === 2 * this.minDegree - 1) {
      this._splitChild(node, index);
      if (value > node.keys[index]) index += 1;
    }
    this._insertNonFull(node.children[index], value);
  }

  inorder() {
    const result = [];
    const walk = (node) => {
      for (let i = 0; i < node.keys.length; i += 1) {
        if (!node.leaf) walk(node.children[i]);
        result.push(node.keys[i]);
      }
      if (!node.leaf) walk(node.children[node.keys.length]);
    };
    walk(this.root);
    return result;
  }
}

export function bTreeOperations(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const { values = [], search = [], minDegree = 2 } = input;
  assertValues(values);
  assertValues(search);
  const tree = new BTree(minDegree);
  values.forEach((value) => tree.insert(value));
  return { inorder: tree.inorder(), searches: search.map((value) => ({ value, found: tree.search(value) })), size: tree.size };
}

class BPlusNode {
  constructor(leaf) {
    this.leaf = leaf;
    this.keys = [];
    this.children = [];
    this.next = null;
  }
}

/**
 * Demonstrative B+ tree. Leaves retain all values and are linked for range scans;
 * insert/search are O(log n), range scan is O(log n + k), for fixed order.
 */
export class BPlusTree {
  constructor(order = 4) {
    if (!Number.isSafeInteger(order) || order < 3 || order > 16) {
      throw new RangeError('order must be an integer from 3 to 16');
    }
    this.order = order;
    this.root = new BPlusNode(true);
    this.size = 0;
  }

  _leafFor(value) {
    let node = this.root;
    while (!node.leaf) {
      let index = 0;
      while (index < node.keys.length && value >= node.keys[index]) index += 1;
      node = node.children[index];
    }
    return node;
  }

  search(value) {
    assertNumber(value);
    const leaf = this._leafFor(value);
    return leaf.keys.includes(value);
  }

  insert(value) {
    assertNumber(value);
    if (this.search(value)) return false;
    const insertInto = (node) => {
      if (node.leaf) {
        let index = 0;
        while (index < node.keys.length && node.keys[index] < value) index += 1;
        node.keys.splice(index, 0, value);
        if (node.keys.length < this.order) return null;
        const right = new BPlusNode(true);
        right.keys = node.keys.splice(Math.ceil(node.keys.length / 2));
        right.next = node.next;
        node.next = right;
        return { separator: right.keys[0], right };
      }
      let index = 0;
      while (index < node.keys.length && value >= node.keys[index]) index += 1;
      const split = insertInto(node.children[index]);
      if (!split) return null;
      node.keys.splice(index, 0, split.separator);
      node.children.splice(index + 1, 0, split.right);
      if (node.keys.length < this.order) return null;
      const middle = Math.floor(node.keys.length / 2);
      const right = new BPlusNode(false);
      const separator = node.keys[middle];
      right.keys = node.keys.slice(middle + 1);
      right.children = node.children.slice(middle + 1);
      node.keys = node.keys.slice(0, middle);
      node.children = node.children.slice(0, middle + 1);
      return { separator, right };
    };
    const split = insertInto(this.root);
    if (split) {
      const root = new BPlusNode(false);
      root.keys = [split.separator];
      root.children = [this.root, split.right];
      this.root = root;
    }
    this.size += 1;
    return true;
  }

  range(minimum, maximum) {
    assertNumber(minimum, 'minimum');
    assertNumber(maximum, 'maximum');
    if (minimum > maximum) throw new RangeError('minimum must be <= maximum');
    let leaf = this._leafFor(minimum);
    const result = [];
    while (leaf) {
      for (const value of leaf.keys) {
        if (value > maximum) return result;
        if (value >= minimum) result.push(value);
      }
      leaf = leaf.next;
    }
    return result;
  }

  values() {
    return this.range(-Number.MAX_VALUE, Number.MAX_VALUE);
  }
}

export function bPlusTreeOperations(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const { values = [], search = [], range = null, order = 4 } = input;
  assertValues(values);
  assertValues(search);
  const tree = new BPlusTree(order);
  values.forEach((value) => tree.insert(value));
  const result = {
    values: tree.values(),
    searches: search.map((value) => ({ value, found: tree.search(value) })),
    size: tree.size,
  };
  if (range !== null) {
    if (!Array.isArray(range) || range.length !== 2) throw new TypeError('range must be [minimum, maximum]');
    result.range = tree.range(range[0], range[1]);
  }
  return result;
}

class BinomialNode {
  constructor(key) {
    this.key = key;
    this.degree = 0;
    this.parent = null;
    this.child = null;
    this.sibling = null;
  }
}

/** Binomial heap core operations: insert/extractMin O(log n), peek O(log n). */
export class BinomialHeap {
  constructor(values = []) {
    assertValues(values);
    this.head = null;
    this.size = 0;
    values.forEach((value) => this.insert(value));
  }

  _mergeRoots(a, b) {
    const dummy = new BinomialNode(0);
    let tail = dummy;
    while (a && b) {
      if (a.degree <= b.degree) {
        tail.sibling = a;
        a = a.sibling;
      } else {
        tail.sibling = b;
        b = b.sibling;
      }
      tail = tail.sibling;
    }
    tail.sibling = a || b;
    return dummy.sibling;
  }

  _link(child, parent) {
    child.parent = parent;
    child.sibling = parent.child;
    parent.child = child;
    parent.degree += 1;
  }

  _unionRoots(otherHead) {
    this.head = this._mergeRoots(this.head, otherHead);
    if (!this.head) return;
    let previous = null;
    let current = this.head;
    let next = current.sibling;
    while (next) {
      if (current.degree !== next.degree
        || (next.sibling && next.sibling.degree === current.degree)) {
        previous = current;
        current = next;
      } else if (current.key <= next.key) {
        current.sibling = next.sibling;
        this._link(next, current);
      } else {
        if (!previous) this.head = next;
        else previous.sibling = next;
        this._link(current, next);
        current = next;
      }
      next = current.sibling;
    }
  }

  insert(key) {
    assertNumber(key);
    const node = new BinomialNode(key);
    this._unionRoots(node);
    this.size += 1;
    return node;
  }

  peek() {
    let best = null;
    for (let node = this.head; node; node = node.sibling) {
      if (!best || node.key < best) best = node.key;
    }
    return best;
  }

  extractMin() {
    if (!this.head) return null;
    let min = this.head;
    let minPrevious = null;
    let previous = null;
    for (let node = this.head; node; node = node.sibling) {
      if (node.key < min.key) {
        min = node;
        minPrevious = previous;
      }
      previous = node;
    }
    if (minPrevious) minPrevious.sibling = min.sibling;
    else this.head = min.sibling;
    let children = min.child;
    let reversed = null;
    while (children) {
      const next = children.sibling;
      children.parent = null;
      children.sibling = reversed;
      reversed = children;
      children = next;
    }
    this._unionRoots(reversed);
    this.size -= 1;
    return min.key;
  }

  drain() {
    const values = [];
    while (this.size) values.push(this.extractMin());
    return values;
  }
}

class FibonacciNode {
  constructor(key) {
    this.key = key;
    this.degree = 0;
    this.mark = false;
    this.parent = null;
    this.child = null;
    this.left = this;
    this.right = this;
  }
}

function spliceCircularAfter(anchor, node) {
  node.left = anchor;
  node.right = anchor.right;
  anchor.right.left = node;
  anchor.right = node;
}

function removeCircular(node) {
  node.left.right = node.right;
  node.right.left = node.left;
  node.left = node;
  node.right = node;
}

/** Fibonacci heap core operations: insert/decreaseKey amortized O(1), extractMin O(log n). */
export class FibonacciHeap {
  constructor(values = []) {
    assertValues(values);
    this.minimum = null;
    this.size = 0;
    values.forEach((value) => this.insert(value));
  }

  insert(key) {
    assertNumber(key);
    const node = new FibonacciNode(key);
    if (!this.minimum) this.minimum = node;
    else {
      spliceCircularAfter(this.minimum, node);
      if (key < this.minimum.key) this.minimum = node;
    }
    this.size += 1;
    return node;
  }

  peek() {
    return this.minimum ? this.minimum.key : null;
  }

  _addRoot(node) {
    node.parent = null;
    node.mark = false;
    if (!this.minimum) {
      node.left = node;
      node.right = node;
      this.minimum = node;
    } else {
      spliceCircularAfter(this.minimum, node);
      if (node.key < this.minimum.key) this.minimum = node;
    }
  }

  _link(child, parent) {
    removeCircular(child);
    child.parent = parent;
    child.mark = false;
    if (!parent.child) parent.child = child;
    else spliceCircularAfter(parent.child, child);
    parent.degree += 1;
  }

  _consolidate() {
    const roots = [];
    if (this.minimum) {
      let current = this.minimum;
      do {
        roots.push(current);
        current = current.right;
      } while (current !== this.minimum);
    }
    const degrees = [];
    roots.forEach((root) => {
      let node = root;
      let degree = node.degree;
      while (degrees[degree]) {
        let other = degrees[degree];
        if (node.key > other.key) [node, other] = [other, node];
        this._link(other, node);
        degrees[degree] = null;
        degree += 1;
      }
      degrees[degree] = node;
    });
    this.minimum = null;
    degrees.filter(Boolean).forEach((root) => {
      root.left = root;
      root.right = root;
      this._addRoot(root);
    });
  }

  extractMin() {
    const minimum = this.minimum;
    if (!minimum) return null;
    if (minimum.child) {
      const children = [];
      let child = minimum.child;
      do {
        children.push(child);
        child = child.right;
      } while (child !== minimum.child);
      children.forEach((node) => {
        removeCircular(node);
        this._addRoot(node);
      });
    }
    if (minimum.right === minimum) this.minimum = null;
    else {
      const next = minimum.right;
      removeCircular(minimum);
      this.minimum = next;
      this._consolidate();
    }
    this.size -= 1;
    return minimum.key;
  }

  _cut(node, parent) {
    if (parent.child === node) parent.child = node.right === node ? null : node.right;
    removeCircular(node);
    parent.degree -= 1;
    this._addRoot(node);
  }

  _cascadingCut(node) {
    const parent = node.parent;
    if (!parent) return;
    if (!node.mark) node.mark = true;
    else {
      this._cut(node, parent);
      this._cascadingCut(parent);
    }
  }

  decreaseKey(node, key) {
    if (!(node instanceof FibonacciNode)) throw new TypeError('node must be a Fibonacci heap node');
    assertNumber(key, 'key');
    if (key > node.key) throw new RangeError('new key must not exceed the current key');
    node.key = key;
    const parent = node.parent;
    if (parent && node.key < parent.key) {
      this._cut(node, parent);
      this._cascadingCut(parent);
    }
    if (!this.minimum || node.key < this.minimum.key) this.minimum = node;
    return node;
  }

  drain() {
    const values = [];
    while (this.size) values.push(this.extractMin());
    return values;
  }
}

export function heapComparison(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const { values = [] } = input;
  assertValues(values);
  if (values.length > 10000) throw new RangeError('heap comparison is limited to 10000 values');
  const binomial = new BinomialHeap(values);
  const fibonacci = new FibonacciHeap(values);
  const benchmark = (Heap) => {
    const started = performance.now();
    const heap = new Heap();
    values.forEach((value) => heap.insert(value));
    const extractedAscending = heap.drain();
    return {
      elapsedMilliseconds: Number((performance.now() - started).toFixed(3)),
      output: extractedAscending
    };
  };
  const binomialBenchmark = benchmark(BinomialHeap);
  const fibonacciBenchmark = benchmark(FibonacciHeap);
  return {
    inputSize: values.length,
    binomial: { minimum: binomial.peek(), extractedAscending: binomial.drain() },
    fibonacci: { minimum: fibonacci.peek(), extractedAscending: fibonacci.drain() },
    benchmark: {
      measurement: 'Single local insert-and-extract run; elapsed time depends on runtime and hardware.',
      binomialMilliseconds: binomialBenchmark.elapsedMilliseconds,
      fibonacciMilliseconds: fibonacciBenchmark.elapsedMilliseconds,
      outputsMatch: binomialBenchmark.output.every((value, index) => value === fibonacciBenchmark.output[index]),
    },
    operations: {
      insert: { binomial: 'O(log n)', fibonacci: 'amortized O(1)' },
      minimum: { binomial: 'O(log n)', fibonacci: 'O(1)' },
      extractMin: { binomial: 'O(log n)', fibonacci: 'amortized O(log n)' },
    },
  };
}

export function advancedStructureCatalog() {
  return {
    redBlackTree: { insert: 'O(log n)', search: 'O(log n)', traverse: 'O(n)' },
    bTree: { insert: 'O(log n)', search: 'O(log n)', traverse: 'O(n)' },
    bPlusTree: { insert: 'O(log n)', search: 'O(log n)', range: 'O(log n + k)' },
    binomialHeap: { insert: 'O(log n)', extractMin: 'O(log n)' },
    fibonacciHeap: { insert: 'amortized O(1)', extractMin: 'amortized O(log n)', decreaseKey: 'amortized O(1)' },
  };
}
