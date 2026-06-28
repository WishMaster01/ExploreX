export class PriorityQueue<T> {
  private readonly heap: Array<{ value: T; priority: number }> = [];

  get size(): number {
    return this.heap.length;
  }

  push(value: T, priority: number): void {
    this.heap.push({ value, priority });
    let index = this.heap.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent].priority >= priority) break;
      this.heap[index] = this.heap[parent];
      index = parent;
    }
    this.heap[index] = { value, priority };
  }

  pop(): T | undefined {
    if (!this.heap.length) return undefined;
    const result = this.heap[0].value;
    const tail = this.heap.pop();
    if (!this.heap.length || !tail) return result;

    let index = 0;
    this.heap[0] = tail;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let largest = index;
      if (left < this.heap.length && this.heap[left].priority > this.heap[largest].priority) largest = left;
      if (right < this.heap.length && this.heap[right].priority > this.heap[largest].priority) largest = right;
      if (largest === index) break;
      [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
      index = largest;
    }
    return result;
  }
}

