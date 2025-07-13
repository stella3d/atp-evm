export class LocalstorageTtlCache<T> {
  constructor(private ttlMs: number) {
	this.ttlMs = ttlMs;
  }

  get(key: string): T | null {
	const itemStr = localStorage.getItem(key);
	if (!itemStr) return null;

	try {
	  const item = JSON.parse(itemStr);
	  if (Date.now() > item.expiry) {
		localStorage.removeItem(key);
		return null;
	  }
	  return item.value as T;
	} catch (e) {
	  console.error('failed to parse cache item', e);
	  localStorage.removeItem(key);
	  return null;
	}
  }

  set(key: string, value: T) {
	const item = {
	  value,
	  expiry: Date.now() + this.ttlMs,
	};
	localStorage.setItem(key, JSON.stringify(item));
  }
}
