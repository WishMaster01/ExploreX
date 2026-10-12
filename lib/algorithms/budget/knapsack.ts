export type BudgetItem<T = unknown> = {
  cost: number;
  value: number;
  item: T;
};

export type BudgetAllocation = {
  accommodation: number;
  food: number;
  transport: number;
  activities: number;
  emergency: number;
  miscellaneous: number;
};

/** Derives category envelopes from trip context instead of a fixed activity percentage. */
export function allocateTripBudget(
  total: number,
  days: number,
  partySize = 1,
  travelStyle = "standard",
): BudgetAllocation {
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const safeDays = Math.max(1, Math.min(365, Math.floor(days) || 1));
  const people = Math.max(1, Math.min(100, Math.floor(partySize) || 1));
  const style = travelStyle.toLowerCase();
  const durationPressure = Math.min(0.06, Math.log2(safeDays + 1) * 0.01);
  const partyPressure = people >= 4 ? 0.02 : 0;
  const lodging =
    (/luxury|premium/.test(style)
      ? 0.42
      : /budget|backpack/.test(style)
        ? 0.27
        : 0.34) - partyPressure;
  const food = (/food|culinary/.test(style) ? 0.23 : 0.2) + durationPressure;
  const transport =
    (/slow|local|walking/.test(style) ? 0.1 : 0.15) + (safeDays > 5 ? 0.02 : 0);
  const emergency = 0.1;
  const miscellaneous = 0.06;
  const activities = Math.max(
    0.05,
    1 - lodging - food - transport - emergency - miscellaneous,
  );
  const raw = {
    accommodation: lodging,
    food,
    transport,
    activities,
    emergency,
    miscellaneous,
  };
  const totalWeight =
    Object.values(raw).reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
  const factor = safeTotal / totalWeight;
  return {
    accommodation: factor * lodging,
    food: factor * food,
    transport: factor * transport,
    activities: factor * activities,
    emergency: factor * emergency,
    miscellaneous: factor * miscellaneous,
  };
}

export function selectWithinBudget<T>(
  items: BudgetItem<T>[],
  budget: number,
  resolution = 10,
): { selected: T[]; cost: number; value: number } {
  if (!Number.isFinite(budget) || budget <= 0 || !items.length)
    return { selected: [], cost: 0, value: 0 };
  const safeResolution = Number.isFinite(resolution)
    ? Math.max(1, resolution)
    : 10;
  // Cap the DP table so very large budgets cannot allocate unbounded memory.
  const capacity = Math.min(
    100_000,
    Math.max(0, Math.floor(budget / safeResolution)),
  );
  const normalized = items
    .filter(
      (entry) =>
        Number.isFinite(entry.cost) &&
        Number.isFinite(entry.value) &&
        entry.cost >= 0 &&
        entry.value >= 0,
    )
    .map((entry) => ({
      ...entry,
      units: Math.ceil(entry.cost / safeResolution),
    }));
  const values = Array(capacity + 1).fill(0) as number[];
  const choices: boolean[][] = normalized.map(() =>
    Array(capacity + 1).fill(false),
  );

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
