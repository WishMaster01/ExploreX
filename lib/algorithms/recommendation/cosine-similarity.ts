export function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.max(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftMagnitude += a * a;
    rightMagnitude += b * b;
  }
  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function textVector(text: string, vocabulary: string[]): number[] {
  const words = new Set(text.toLocaleLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  return vocabulary.map((term) => (words.has(term) ? 1 : 0));
}

