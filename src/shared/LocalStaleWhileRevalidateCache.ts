export class LocalStaleWhileRevalidateCache<T> {
  constructor(
    private staleTtlMs: number,
    private freshTtlMs: number
  ) {}

  private getCacheItem(key: string): { value: T; writtenAt: number } | null {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    try {
      const item = JSON.parse(itemStr);
      const age = Date.now() - item.writtenAt;
      
      // if data is older than stale TTL, remove it
      if (age > this.staleTtlMs) {
        localStorage.removeItem(key);
        return null;
      }
      
      return item;
    } catch (e) {
      console.error('Failed to parse cache item', e);
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Get cached data using stale-while-revalidate pattern
   * @param key Cache key to use
   * @param fetcher Function to fetch fresh data when needed
   * @param onUpdate Optional callback when fresh data is available
   * @returns Cached data (fresh if available, stale if not) or null if no cache
   */
  async get(
    key: string,
    fetcher: () => Promise<T>,
    onUpdate?: (data: T) => void
  ): Promise<T | null> {
    const cachedItem = this.getCacheItem(key);
    
    if (!cachedItem) {
      // No cached data, fetch fresh
      return await this.revalidate(key, fetcher, onUpdate);
    }

    const age = Date.now() - cachedItem.writtenAt;
    
    // If data is fresh, return it immediately
    if (age <= this.freshTtlMs) {
      return cachedItem.value;
    }

    // Data is stale but valid, return it and start background revalidation
    const revalidatePromise = this.revalidate(key, fetcher, onUpdate);
    
    // Don't await the revalidation, let it happen in background
    revalidatePromise.catch(error => {
      console.warn('Background revalidation failed:', error);
    });
    
    return cachedItem.value;
  }

  /**
   * Set data in cache with current timestamp
   */
  set(key: string, value: T): void {
    const item = {
      value,
      writtenAt: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(item));
  }

  /**
   * Clear cached data for a specific key
   */
  clear(key: string): void {
    localStorage.removeItem(key);
  }

  private async revalidate(
    key: string,
    fetcher: () => Promise<T>,
    onUpdate?: (data: T) => void
  ): Promise<T> {
    try {
      const freshData = await fetcher();
      
      // Cache the new data
      this.set(key, freshData);
      
      // Notify caller if callback provided
      if (onUpdate) {
        onUpdate(freshData);
      }
      
      return freshData;
    } catch (error) {
      console.error('Failed to revalidate cache data:', error);
      throw error;
    }
  }
}
