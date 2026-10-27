function assertValues(values) {
  if (!Array.isArray(values)) throw new TypeError("values must be an array");
  values.forEach((value, index) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`values[${index}] must be a finite number`);
    }
  });
}

/**
 * In-order right-threaded search tree. Thread refresh keeps the demonstration
 * straightforward; insertion is O(n), search O(h), and traversal O(n).
 */
export class ThreadedBinarySearchTree {
  constructor(values = []) {
    assertValues(values);
    this.root = null;
    this.size = 0;
    for (const value of values) this._insertUnthreaded(value);
    this._refreshThreads();
  }

  _insertUnthreaded(value) {
    if (!this.root) {
      this.root = { value, left: null, right: null, rightThread: false };
      this.size += 1;
      return true;
    }

    let node = this.root;
    while (true) {
      if (value === node.value) return false;
      const direction = value < node.value ? "left" : "right";
      if (node[direction]) {
        node = node[direction];
      } else {
        node[direction] = { value, left: null, right: null, rightThread: false };
        this.size += 1;
        return true;
      }
    }
  }

  _refreshThreads() {
    const stack = [];
    const nodes = [];
    let current = this.root;
    while (current || stack.length) {
      while (current) {
        stack.push(current);
        current = current.left;
      }
      current = stack.pop();
      nodes.push(current);
      current = current.rightThread ? null : current.right;
    }
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (!node.right) {
        node.right = nodes[index + 1] ?? null;
        node.rightThread = true;
      }
    }
  }

  insert(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError("value must be a finite number");
    }
    let current = this.root;
    while (current) {
      if (value === current.value) return false;
      if (value < current.value) current = current.left;
      else if (current.rightThread) break;
      else current = current.right;
    }

    const nodes = [];
    const stack = [];
    current = this.root;
    while (current || stack.length) {
      while (current) {
        stack.push(current);
        current = current.left;
      }
      current = stack.pop();
      nodes.push(current);
      current = current.rightThread ? null : current.right;
    }
    for (const node of nodes) {
      if (node.rightThread) {
        node.right = null;
        node.rightThread = false;
      }
    }
    const inserted = this._insertUnthreaded(value);
    if (inserted) this._refreshThreads();
    return inserted;
  }

  search(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError("value must be a finite number");
    }
    let current = this.root;
    while (current) {
      if (current.value === value) return true;
      if (value < current.value) current = current.left;
      else current = current.rightThread ? null : current.right;
    }
    return false;
  }

  inorder() {
    const result = [];
    let current = this.root;
    while (current?.left) current = current.left;
    while (current) {
      result.push(current.value);
      if (current.rightThread) {
        current = current.right;
      } else {
        current = current.right;
        while (current && current.left) current = current.left;
      }
    }
    return result;
  }
}

export function threadedTreeOperations(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("input must be an object");
  }
  const { values = [], search = [], insert = [] } = input;
  assertValues(values);
  assertValues(search);
  assertValues(insert);
  const tree = new ThreadedBinarySearchTree(values);
  const inserted = insert.map((value) => ({ value, inserted: tree.insert(value) }));
  return {
    inorder: tree.inorder(),
    searches: search.map((value) => ({ value, found: tree.search(value) })),
    inserted,
    size: tree.size
  };
}
