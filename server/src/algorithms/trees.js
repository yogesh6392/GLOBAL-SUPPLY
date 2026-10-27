function assertNumber(value, name = 'value') {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

function assertValues(values, name = 'values') {
  if (!Array.isArray(values)) throw new TypeError(`${name} must be an array`);
  values.forEach((value, index) => assertNumber(value, `${name}[${index}]`));
}

class BSTNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

/**
 * Unbalanced binary-search tree. Average search/insert/delete: O(log n);
 * worst case: O(n). Inorder traversal: O(n).
 */
export class BinarySearchTree {
  constructor(values = []) {
    assertValues(values);
    this.root = null;
    this.size = 0;
    values.forEach((value) => this.insert(value));
  }

  insert(value) {
    assertNumber(value);
    if (!this.root) {
      this.root = new BSTNode(value);
      this.size += 1;
      return true;
    }
    let node = this.root;
    while (true) {
      if (value === node.value) return false;
      const side = value < node.value ? 'left' : 'right';
      if (!node[side]) {
        node[side] = new BSTNode(value);
        this.size += 1;
        return true;
      }
      node = node[side];
    }
  }

  search(value) {
    assertNumber(value);
    let node = this.root;
    while (node) {
      if (node.value === value) return true;
      node = value < node.value ? node.left : node.right;
    }
    return false;
  }

  delete(value) {
    assertNumber(value);
    let parent = null;
    let node = this.root;
    while (node && node.value !== value) {
      parent = node;
      node = value < node.value ? node.left : node.right;
    }
    if (!node) return false;
    if (node.left && node.right) {
      let successorParent = node;
      let successor = node.right;
      while (successor.left) {
        successorParent = successor;
        successor = successor.left;
      }
      node.value = successor.value;
      parent = successorParent;
      node = successor;
    }
    const child = node.left || node.right;
    if (!parent) this.root = child;
    else if (parent.left === node) parent.left = child;
    else parent.right = child;
    this.size -= 1;
    return true;
  }

  inorder() {
    const output = [];
    const stack = [];
    let node = this.root;
    while (node || stack.length) {
      while (node) {
        stack.push(node);
        node = node.left;
      }
      node = stack.pop();
      output.push(node.value);
      node = node.right;
    }
    return output;
  }

  preorder() {
    const output = [];
    const stack = this.root ? [this.root] : [];
    while (stack.length) {
      const node = stack.pop();
      output.push(node.value);
      if (node.right) stack.push(node.right);
      if (node.left) stack.push(node.left);
    }
    return output;
  }

  postorder() {
    const output = [];
    const stack = this.root ? [{ node: this.root, expanded: false }] : [];
    while (stack.length) {
      const entry = stack.pop();
      if (entry.expanded) output.push(entry.node.value);
      else {
        stack.push({ node: entry.node, expanded: true });
        if (entry.node.right) stack.push({ node: entry.node.right, expanded: false });
        if (entry.node.left) stack.push({ node: entry.node.left, expanded: false });
      }
    }
    return output;
  }

  levelorder() {
    const output = [];
    const queue = this.root ? [this.root] : [];
    for (let i = 0; i < queue.length; i += 1) {
      const node = queue[i];
      output.push(node.value);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    return output;
  }
}

/**
 * Builds a BST and performs optional searches, insertions, and deletions.
 * The result includes all four traversals and the search/deletion outcomes.
 */
export function bstOperations(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const { values = [], search = [], insert = [], delete: deletions = [] } = input;
  assertValues(values);
  assertValues(search, 'search');
  assertValues(insert, 'insert');
  assertValues(deletions, 'delete');
  const tree = new BinarySearchTree(values);
  const searches = search.map((value) => ({ value, found: tree.search(value) }));
  const inserted = insert.map((value) => ({ value, inserted: tree.insert(value) }));
  const deleted = deletions.map((value) => ({ value, deleted: tree.delete(value) }));
  return {
    traversals: {
      inorder: tree.inorder(),
      preorder: tree.preorder(),
      postorder: tree.postorder(),
      levelorder: tree.levelorder(),
    },
    searches,
    inserted,
    deleted,
    size: tree.size,
  };
}

class AVLNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

function height(node) {
  return node ? node.height : 0;
}

function updateHeight(node) {
  node.height = 1 + Math.max(height(node.left), height(node.right));
}

function rotateRight(root) {
  const pivot = root.left;
  root.left = pivot.right;
  pivot.right = root;
  updateHeight(root);
  updateHeight(pivot);
  return pivot;
}

function rotateLeft(root) {
  const pivot = root.right;
  root.right = pivot.left;
  pivot.left = root;
  updateHeight(root);
  updateHeight(pivot);
  return pivot;
}

/** AVL search/insert: O(log n); inorder traversal: O(n). Duplicate keys are ignored. */
export class AVLTree {
  constructor(values = []) {
    assertValues(values);
    this.root = null;
    this.size = 0;
    values.forEach((value) => this.insert(value));
  }

  insert(value) {
    assertNumber(value);
    let inserted = false;
    const add = (node) => {
      if (!node) {
        inserted = true;
        return new AVLNode(value);
      }
      if (value === node.value) return node;
      if (value < node.value) node.left = add(node.left);
      else node.right = add(node.right);
      updateHeight(node);
      const balance = height(node.left) - height(node.right);
      if (balance > 1) {
        if (value > node.left.value) node.left = rotateLeft(node.left);
        return rotateRight(node);
      }
      if (balance < -1) {
        if (value < node.right.value) node.right = rotateRight(node.right);
        return rotateLeft(node);
      }
      return node;
    };
    this.root = add(this.root);
    if (inserted) this.size += 1;
    return inserted;
  }

  search(value) {
    assertNumber(value);
    let node = this.root;
    while (node) {
      if (value === node.value) return true;
      node = value < node.value ? node.left : node.right;
    }
    return false;
  }

  inorder() {
    const values = [];
    const walk = (node) => {
      if (!node) return;
      walk(node.left);
      values.push(node.value);
      walk(node.right);
    };
    walk(this.root);
    return values;
  }

  get height() {
    return height(this.root);
  }
}

export function avlOperations(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const { values = [], search = [] } = input;
  assertValues(values);
  assertValues(search, 'search');
  const tree = new AVLTree(values);
  return {
    inorder: tree.inorder(),
    searches: search.map((value) => ({ value, found: tree.search(value) })),
    size: tree.size,
    height: tree.height,
  };
}
