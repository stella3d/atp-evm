import type { DefinedDidString } from "./common.ts";

// Cache configuration
const CACHE_DURATION = import.meta.env.DEV 
  ? 30 * 60 * 1000 // 30 minutes in development
  : 5 * 60 * 1000;  // 5 minutes in production

const CACHE_KEY = 'users_with_address_record';

interface CacheEntry {
  data: DefinedDidString[];
  timestamp: number;
}

const getCachedData = (): DefinedDidString[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if ((now - entry.timestamp) < CACHE_DURATION) {
      console.log('Using cached users data from localStorage');
      return entry.data;
    } else {
      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.error('Error reading from cache:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

const setCachedData = (data: DefinedDidString[]): void => {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
};

export const fetchUsersWithAddressRecord = async (): Promise<DefinedDidString[]> => {
  // Check cache first
  const cachedData = getCachedData();
  if (cachedData) {
    return cachedData;
  }

  // Cache miss or expired, fetch new data
  type ResponseShape = { repos: { did: DefinedDidString }[] };
  // using regular fetch skips needing OAuth permissions
  const res = await fetch('https://relay1.us-west.bsky.network/xrpc/com.atproto.sync.listReposByCollection?collection=club.stellz.evm.addressControl');
  const data: ResponseShape = await res.json();
  const users = data.repos.map(r => r.did);
  
  // Cache the new data
  setCachedData(users);
  console.log('Fetched and cached new users data');
  
  return users;
}