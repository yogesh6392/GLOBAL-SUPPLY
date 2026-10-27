function assertNumber(value, name = 'value') {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

function assertValues(values) {
  if (!Array.isArray(values)) throw new TypeError('values must be an array');
  values.forEach((value, index) => assertNumber(value, `values[${index}]`));
}

/** Heap sort; O(n log n) time, O(n) returned copy, and O(1) extra workspace. */
export function heapSort(values) {
  assertValues(values);
  const result = values.slice();
  const siftDown = (start, end) => {
    let root = start;
    while (root * 2 + 1 <= end) {
      let child = root * 2 + 1;
      if (child + 1 <= end && result[child] < result[child + 1]) child += 1;
      if (result[root] >= result[child]) return;
      [result[root], result[child]] = [result[child], result[root]];
      root = child;
    }
  };
  for (let start = Math.floor(result.length / 2) - 1; start >= 0; start -= 1) {
    siftDown(start, result.length - 1);
  }
  for (let end = result.length - 1; end > 0; end -= 1) {
    [result[0], result[end]] = [result[end], result[0]];
    siftDown(0, end - 1);
  }
  return result;
}

/**
 * Binary min-priority queue. Push/pop are O(log n), peek is O(1).
 * A monotonically increasing sequence provides deterministic FIFO tie-breaking.
 */
export class BinaryPriorityQueue {
  constructor(values = []) {
    if (!Array.isArray(values)) throw new TypeError('values must be an array');
    this.heap = [];
    this.sequence = 0;
    values.forEach((entry) => {
      if (typeof entry === 'number') this.enqueue(entry, entry);
      else if (entry && typeof entry === 'object' && 'priority' in entry) {
        this.enqueue(entry.value, entry.priority);
      } else throw new TypeError('each queue entry must be a number or { value, priority }');
    });
  }

  get size() {
    return this.heap.length;
  }

  _less(a, b) {
    return a.priority < b.priority || (a.priority === b.priority && a.sequence < b.sequence);
  }

  enqueue(value, priority = value) {
    assertNumber(priority, 'priority');
    const entry = { value, priority, sequence: this.sequence++ };
    this.heap.push(entry);
    let index = this.heap.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this._less(this.heap[index], this.heap[parent])) break;
      [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
      index = parent;
    }
    return this.size;
  }

  peek() {
    if (!this.size) return null;
    const { value, priority } = this.heap[0];
    return { value, priority };
  }

  dequeue() {
    if (!this.size) return null;
    const first = this.heap[0];
    const last = this.heap.pop();
    if (this.size) {
      this.heap[0] = last;
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.size && this._less(this.heap[left], this.heap[smallest])) smallest = left;
        if (right < this.size && this._less(this.heap[right], this.heap[smallest])) smallest = right;
        if (smallest === index) break;
        [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
        index = smallest;
      }
    }
    return { value: first.value, priority: first.priority };
  }

  drain() {
    const output = [];
    while (this.size) output.push(this.dequeue());
    return output;
  }
}

export function priorityQueueOperations(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const { entries = [], operations = [] } = input;
  const queue = new BinaryPriorityQueue(entries);
  if (!Array.isArray(operations)) throw new TypeError('operations must be an array');
  const results = operations.map((operation, index) => {
    if (!operation || typeof operation !== 'object') throw new TypeError(`operations[${index}] must be an object`);
    if (operation.type === 'enqueue') {
      queue.enqueue(operation.value, operation.priority);
      return { type: 'enqueue', size: queue.size };
    }
    if (operation.type === 'dequeue') return { type: 'dequeue', item: queue.dequeue() };
    if (operation.type === 'peek') return { type: 'peek', item: queue.peek() };
    throw new TypeError(`operations[${index}].type must be enqueue, dequeue, or peek`);
  });
  return { results, remaining: queue.drain() };
}
