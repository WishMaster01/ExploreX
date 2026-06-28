type TrieNode = {
  children: Map<string, TrieNode>;
  values: Set<string>;
};

function node(): TrieNode {
  return { children: new Map(), values: new Set() };
}

export class Trie {
  private readonly root = node();

  constructor(values: string[] = []) {
    values.forEach((value) => this.insert(value));
  }

  insert(value: string): void {
    const normalized = value.toLocaleLowerCase().trim();
    if (!normalized) return;

    let current = this.root;
    for (const character of normalized) {
      let child = current.children.get(character);
      if (!child) {
        child = node();
        current.children.set(character, child);
      }
      child.values.add(value);
      current = child;
    }
  }

  search(prefix: string, limit = 8): string[] {
    let current = this.root;
    for (const character of prefix.toLocaleLowerCase().trim()) {
      const child = current.children.get(character);
      if (!child) return [];
      current = child;
    }
    return [...current.values].slice(0, Math.max(0, limit));
  }
}

