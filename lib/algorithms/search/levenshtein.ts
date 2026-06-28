export function levenshteinDistance(left: string, right: string): number {
  const a = left.toLocaleLowerCase().trim();
  const b = right.toLocaleLowerCase().trim();

  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  let previous = Array.from({ length: shorter.length + 1 }, (_, index) => index);

  for (let row = 1; row <= longer.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= shorter.length; column += 1) {
      const substitutionCost = longer[row - 1] === shorter[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + substitutionCost,
      );
    }
    previous = current;
  }

  return previous[shorter.length];
}

