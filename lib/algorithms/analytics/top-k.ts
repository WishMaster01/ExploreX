import { PriorityQueue } from "../recommendation/priority-queue";

export function topK<T>(items: T[], score: (item: T) => number, count: number): T[] {
  const queue = new PriorityQueue<T>();
  items.forEach((item) => queue.push(item, score(item)));
  const result: T[] = [];
  while (result.length < count && queue.size) {
    const item = queue.pop();
    if (item !== undefined) result.push(item);
  }
  return result;
}

