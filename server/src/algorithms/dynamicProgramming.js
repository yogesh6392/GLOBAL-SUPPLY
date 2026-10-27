function assertArray(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
}

function assertInteger(value, name, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${name} must be a safe integer >= ${minimum}`);
  }
}

/**
 * 0/1 knapsack with reconstruction. O(nW) time and O(nW) space.
 * Capacity is capped at 20,000 to keep untrusted requests bounded.
 */
export function knapsack01({ items, capacity } = {}) {
  assertArray(items, 'items');
  assertInteger(capacity, 'capacity');
  if (capacity > 20000) throw new RangeError('capacity must not exceed 20000');
  const normalized = items.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError(`items[${index}] must be an object`);
    assertInteger(item.weight, `items[${index}].weight`);
    if (typeof item.value !== 'number' || !Number.isFinite(item.value)) {
      throw new TypeError(`items[${index}].value must be finite`);
    }
    return { weight: item.weight, value: item.value };
  });
  if ((normalized.length + 1) * (capacity + 1) > 2_000_000) {
    throw new RangeError('knapsack state table exceeds 2000000 cells');
  }
  const dp = Array.from({ length: normalized.length + 1 }, () => Array(capacity + 1).fill(0));
  for (let i = 1; i <= normalized.length; i += 1) {
    const item = normalized[i - 1];
    for (let weight = 0; weight <= capacity; weight += 1) {
      dp[i][weight] = dp[i - 1][weight];
      if (item.weight <= weight) {
        dp[i][weight] = Math.max(dp[i][weight], dp[i - 1][weight - item.weight] + item.value);
      }
    }
  }
  const chosen = [];
  let remaining = capacity;
  for (let i = normalized.length; i > 0; i -= 1) {
    if (dp[i][remaining] !== dp[i - 1][remaining]) {
      chosen.push(i - 1);
      remaining -= normalized[i - 1].weight;
    }
  }
  chosen.reverse();
  return {
    maxValue: dp[normalized.length][capacity],
    selectedIndices: chosen,
    totalWeight: chosen.reduce((sum, i) => sum + normalized[i].weight, 0),
  };
}

/**
 * Longest common subsequence with reconstruction. O(mn) time and space;
 * each input is capped at 1,000 Unicode code points.
 */
export function longestCommonSubsequence({ first, second } = {}) {
  if (typeof first !== 'string' || typeof second !== 'string') throw new TypeError('first and second must be strings');
  const a = Array.from(first);
  const b = Array.from(second);
  if (a.length > 1000 || b.length > 1000) throw new RangeError('LCS inputs must each contain at most 1000 code points');
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const sequence = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      sequence.push(a[i - 1]);
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i -= 1;
    else j -= 1;
  }
  sequence.reverse();
  return { length: dp[a.length][b.length], sequence: sequence.join('') };
}

/**
 * Matrix-chain multiplication order. O(n³) time and O(n²) space.
 * At most 100 matrices are accepted.
 */
export function matrixChainOrder({ dimensions } = {}) {
  assertArray(dimensions, 'dimensions');
  if (dimensions.length < 2) throw new RangeError('dimensions must contain at least two entries');
  dimensions.forEach((value, i) => {
    assertInteger(value, `dimensions[${i}]`, 1);
  });
  const n = dimensions.length - 1;
  if (n > 100) throw new RangeError('matrix chain must contain at most 100 matrices');
  const cost = Array.from({ length: n }, () => Array(n).fill(0));
  const split = Array.from({ length: n }, () => Array(n).fill(-1));
  for (let length = 2; length <= n; length += 1) {
    for (let left = 0; left + length <= n; left += 1) {
      const right = left + length - 1;
      cost[left][right] = Infinity;
      for (let pivot = left; pivot < right; pivot += 1) {
        const candidate = cost[left][pivot] + cost[pivot + 1][right]
          + dimensions[left] * dimensions[pivot + 1] * dimensions[right + 1];
        if (candidate < cost[left][right]) {
          cost[left][right] = candidate;
          split[left][right] = pivot;
        }
      }
    }
  }
  const format = (left, right) => left === right
    ? `A${left + 1}`
    : `(${format(left, split[left][right])}×${format(split[left][right] + 1, right)})`;
  return { minMultiplications: cost[0][n - 1], parenthesization: format(0, n - 1) };
}

/**
 * Discrete multi-project resource allocation. Each project receives at most
 * one option; unused capacity is allowed. O(P*B*O) time and O(P*B) space.
 */
export function resourceAllocation({ projects, budget } = {}) {
  assertArray(projects, "projects");
  assertInteger(budget, "budget");
  if (budget > 20_000) throw new RangeError("budget must not exceed 20000");
  if (projects.length > 100) throw new RangeError("at most 100 projects may be allocated");

  const normalized = projects.map((project, projectIndex) => {
    if (!project || typeof project !== "object" || Array.isArray(project)) {
      throw new TypeError(`projects[${projectIndex}] must be an object`);
    }
    if (project.options !== undefined && !Array.isArray(project.options)) {
      throw new TypeError(`projects[${projectIndex}].options must be an array`);
    }
    const options = (project.options ?? []).map((option, optionIndex) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) {
        throw new TypeError(`projects[${projectIndex}].options[${optionIndex}] must be an object`);
      }
      assertInteger(option.resources, `projects[${projectIndex}].options[${optionIndex}].resources`);
      if (typeof option.value !== "number" || !Number.isFinite(option.value)) {
        throw new TypeError(`projects[${projectIndex}].options[${optionIndex}].value must be finite`);
      }
      return { resources: option.resources, value: option.value, label: option.label ?? null };
    });
    if (options.length > 100) throw new RangeError("each project must have at most 100 options");
    return { name: project.name ?? `Project ${projectIndex + 1}`, options };
  });
  if ((normalized.length + 1) * (budget + 1) > 2_000_000) {
    throw new RangeError("resource allocation state table exceeds 2000000 cells");
  }

  const values = Array.from({ length: normalized.length + 1 }, () => Array(budget + 1).fill(0));
  const choices = Array.from({ length: normalized.length + 1 }, () => Array(budget + 1).fill(-1));
  for (let project = 1; project <= normalized.length; project += 1) {
    const options = normalized[project - 1].options;
    for (let available = 0; available <= budget; available += 1) {
      values[project][available] = values[project - 1][available];
      for (let optionIndex = 0; optionIndex < options.length; optionIndex += 1) {
        const option = options[optionIndex];
        if (option.resources > available) continue;
        const candidate = values[project - 1][available - option.resources] + option.value;
        if (candidate > values[project][available]) {
          values[project][available] = candidate;
          choices[project][available] = optionIndex;
        }
      }
    }
  }

  const selected = [];
  let remaining = budget;
  for (let project = normalized.length; project > 0; project -= 1) {
    const optionIndex = choices[project][remaining];
    if (optionIndex < 0) continue;
    const option = normalized[project - 1].options[optionIndex];
    selected.push({
      project: normalized[project - 1].name,
      resources: option.resources,
      value: option.value,
      option: option.label
    });
    remaining -= option.resources;
  }
  selected.reverse();
  return {
    maxValue: values[normalized.length][budget],
    resourcesUsed: selected.reduce((total, option) => total + option.resources, 0),
    selected
  };
}
