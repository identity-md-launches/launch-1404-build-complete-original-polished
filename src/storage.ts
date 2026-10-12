const memory = new Map<string, string>();
let persistent = true;
export const storage = {
  get(key: string) {
    try {
      return (
        localStorage.getItem("pepe-bros:" + key) ?? memory.get(key) ?? null
      );
    } catch {
      persistent = false;
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string) {
    memory.set(key, value);
    try {
      localStorage.setItem("pepe-bros:" + key, value);
    } catch {
      persistent = false;
    }
  },
  get persistent() {
    return persistent;
  },
  best(seed: string) {
    const value = Number(this.get("best:" + seed));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  },
  saveBest(seed: string, score: number) {
    const best = Math.max(this.best(seed), Math.floor(score));
    this.set("best:" + seed, String(best));
    return best;
  },
};
