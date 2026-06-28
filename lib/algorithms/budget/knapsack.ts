export type BudgetItem<T = unknown> = {
  cost: number;
  value: number;
  item: T;
};

export function selectWithinBudget<T>(
  items: BudgetItem<T>[],
  budget: number,
  resolution = 10,
): { selected: T[]; cost: number; value: number } {
  const safeResolution = Math.max(1, resolution);
  const capacity = Math.max(0, Math.floor(budget / safeResolution));
  const normalized = items
    .filter((entry) => entry.cost >= 0 && entry.value >= 0)
    .map((entry) => ({ ...entry, units: Math.ceil(entry.cost / safeResolution) }));
  const values = Array(capacity + 1).fill(0) as number[];
  const choices: boolean[][] = normalized.map(() => Array(capacity + 1).fill(false));

  normalized.forEach((entry, itemIndex) => {
    for (let current = capacity; current >= entry.units; current -= 1) {
      const candidate = values[current - entry.units] + entry.value;
      if (candidate > values[current]) {
        values[current] = candidate;
        choices[itemIndex][current] = true;
      }
    }
  });

  const selected: T[] = [];
  let cursor = capacity;
  let cost = 0;
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const entry = normalized[index];
    if (choices[index][cursor]) {
      selected.push(entry.item);
      cost += entry.cost;
      cursor -= entry.units;
    }
  }
  return { selected: selected.reverse(), cost, value: values[capacity] };
}

