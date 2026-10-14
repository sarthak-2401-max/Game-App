// Minimal key-value interface so persistence can be swapped (AsyncStorage on device,
// in-memory in tests, cloud sync in a future release).
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  async getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  async setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  async removeItem(key: string) {
    this.data.delete(key);
  }
}
