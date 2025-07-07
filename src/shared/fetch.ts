import type { DefinedDidString, EnrichedUser, EnrichedUserCacheEntry, AddressControlRecord } from "./common.ts";
import { BLOCKLISTED_DIDS } from "./spam.ts";

// Cache configuration
const CACHE_DURATION = import.meta.env.DEV 
  ? 30 * 60 * 1000 // 30 minutes in development
  : 5 * 60 * 1000;  // 5 minutes in production

const CACHE_KEY = 'users_with_address_record';
const ENRICHED_CACHE_KEY = 'enriched_users_data_v2';

// Batch size for bulk operations
const BATCH_SIZE = 20;

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
  const users = data.repos
    .map(r => r.did)
    .filter(did => !BLOCKLISTED_DIDS.includes(did)); // remove blocklisted DIDs

    console.log(users);

  // Cache the new data
  setCachedData(users);
  console.log('Fetched and cached new users data');
  
  return users;
}

// Cache functions for enriched user data
const getCachedEnrichedData = (): EnrichedUser[] | null => {
  try {
    const cached = localStorage.getItem(ENRICHED_CACHE_KEY);
    if (!cached) return null;

    const entry: EnrichedUserCacheEntry = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if ((now - entry.timestamp) < CACHE_DURATION) {
      console.log('Using cached enriched users data from localStorage');
      return entry.data;
    } else {
      // Cache expired, remove it
      localStorage.removeItem(ENRICHED_CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.error('Error reading enriched data from cache:', error);
    localStorage.removeItem(ENRICHED_CACHE_KEY);
    return null;
  }
};

const setCachedEnrichedData = (data: EnrichedUser[]): void => {
  try {
    const entry: EnrichedUserCacheEntry = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(ENRICHED_CACHE_KEY, JSON.stringify(entry));
  } catch (error) {
    console.error('Error writing enriched data to cache:', error);
  }
};

// Batch process DIDs to resolve handles and profile info
const batchProcessDids = async (dids: DefinedDidString[]): Promise<EnrichedUser[]> => {
  const enrichedUsers: EnrichedUser[] = [];
  
  // Process in batches of BATCH_SIZE
  for (let i = 0; i < dids.length; i += BATCH_SIZE) {
    const batch = dids.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(dids.length / BATCH_SIZE)}`);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (did) => {
        try {
          // Resolve DID document to get handle and PDS
          const didDoc = await resolveDid(did);
          const handle = extractHandleFromDidDoc(didDoc);
          const pds = extractPdsFromDidDoc(didDoc);
          
          // Fetch profile if we have a handle
          let profileData = null;
          if (handle) {
            profileData = await fetchBlueskyProfile(handle);
          }
          
          return {
            did,
            handle,
            pds,
            displayName: profileData?.displayName,
            avatar: profileData?.avatar,
            description: profileData?.description
          } as EnrichedUser;
        } catch (error) {
          console.warn(`Failed to enrich user ${did}:`, error);
          return { did } as EnrichedUser;
        }
      })
    );
    
    // Add successful results to the enriched users array
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        enrichedUsers.push(result.value);
      }
    });
    
    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < dids.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return enrichedUsers;
};

// DID Document interface
interface DidDocument {
  alsoKnownAs?: string[];
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
  [key: string]: unknown;
}

// Resolve DID document
const resolveDid = async (did: DefinedDidString): Promise<DidDocument> => {
  const response = await fetch(`https://plc.directory/${did}`);
  if (!response.ok) {
    throw new Error(`Failed to resolve DID: ${response.status}`);
  }
  return response.json();
};

// Extract handle from DID document
const extractHandleFromDidDoc = (didDoc: DidDocument): string | undefined => {
  const alsoKnownAs = didDoc.alsoKnownAs;
  if (!Array.isArray(alsoKnownAs)) return undefined;
  
  // Look for at:// URIs which contain the handle
  const atUri = alsoKnownAs.find((aka: string) => aka.startsWith('at://'));
  if (atUri) {
    // Extract handle from at://handle format
    return atUri.replace('at://', '');
  }
  
  return undefined;
};

// Extract PDS from DID document
const extractPdsFromDidDoc = (didDoc: DidDocument): string | undefined => {
  const service = didDoc.service;
  if (!Array.isArray(service)) return undefined;
  
  // Look for ATProto Personal Data Server service
  const pdsService = service.find(s => 
    s.type === 'AtprotoPersonalDataServer' || 
    s.id === '#atproto_pds'
  );
  
  if (pdsService) {
    console.log(`Found PDS for DID: ${pdsService.serviceEndpoint}`);
  }
  
  return pdsService?.serviceEndpoint;
};

// Fetch Bluesky profile data
const fetchBlueskyProfile = async (handle: string): Promise<{
  displayName?: string;
  avatar?: string;
  description?: string;
} | null> => {
  try {
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${handle}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }
    
    const profile = await response.json();
    return {
      displayName: profile.displayName,
      avatar: profile.avatar,
      description: profile.description
    };
  } catch (error) {
    console.warn(`Failed to fetch profile for ${handle}:`, error);
    return null;
  }
};

// Cache duration for address control records
const ADDRESS_RECORDS_CACHE_DURATION = 6 * 60 * 1000; // 6 minutes

// Fetch address control records from user's PDS
export const fetchAddressControlRecords = async (
  did: DefinedDidString, 
  pds: string
): Promise<AddressControlRecord[]> => {
  const cacheKey = `listRecords_${did}`;
  
  // Check cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      console.log(`found cached value for ${cacheKey}`);
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ADDRESS_RECORDS_CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.error('Error reading from address records cache:', error);
    localStorage.removeItem(cacheKey);
  }

  console.log(`no cached value for ${cacheKey}`);

  try {
    // Extract hostname from PDS URL
    const pdsUrl = new URL(pds);
    const pdsHost = pdsUrl.hostname;
    
    console.log(`Fetching address records for ${did} from PDS: ${pdsHost}`);
    
    const response = await fetch(
      `https://${pdsHost}/xrpc/com.atproto.repo.listRecords?repo=${did}&collection=club.stellz.evm.addressControl&limit=16`
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch address control records: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch address control records: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Raw response for ${did}:`, data);
    console.log(`Found ${data.records?.length || 0} address control records for ${did}`);
    
    const records = data.records || [];
    
    // Cache the response
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: records,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error writing to address records cache:', error);
    }
    
    return records;
  } catch (error) {
    console.warn(`Failed to fetch address control records for ${did}:`, error);
    return [];
  }
};

// Main function to fetch enriched users
export const fetchEnrichedUsers = async (): Promise<EnrichedUser[]> => {
  // Check cache first
  const cachedData = getCachedEnrichedData();
  if (cachedData) {
    return cachedData;
  }

  // Get base user list
  const users = await fetchUsersWithAddressRecord();
  
  // Enrich with handles and profile data
  console.log(`Enriching ${users.length} users with handle and profile data...`);
  const enrichedUsers = await batchProcessDids(users);
  
  // Cache the enriched data
  setCachedEnrichedData(enrichedUsers);
  console.log('Fetched and cached enriched users data');
  
  return enrichedUsers;
};

// Progressive enrichment function that updates users as data becomes available
export const enrichUsersProgressively = async (
  userDids: DefinedDidString[],
  onUpdate: (users: EnrichedUser[]) => void
): Promise<void> => {
  // Check if we have cached enriched data
  const cachedData = getCachedEnrichedData();
  if (cachedData) {
    console.log('Using cached enriched data for progressive update');
    onUpdate(cachedData);
    return;
  }

  // Start with basic user objects
  const enrichedUsers: EnrichedUser[] = userDids.map(did => ({ did }));
  
  // Process in batches and update as we go
  for (let i = 0; i < userDids.length; i += BATCH_SIZE) {
    const batch = userDids.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(userDids.length / BATCH_SIZE)} for progressive enrichment`);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (did, batchIndex) => {
        const actualIndex = i + batchIndex;
        try {
          // Resolve DID document to get handle and PDS
          const didDoc = await resolveDid(did);
          const handle = extractHandleFromDidDoc(didDoc);
          const pds = extractPdsFromDidDoc(didDoc);
          
          // Fetch profile if we have a handle
          let profileData = null;
          if (handle) {
            profileData = await fetchBlueskyProfile(handle);
          }
          
          return {
            index: actualIndex,
            enrichedUser: {
              did,
              handle,
              pds,
              displayName: profileData?.displayName,
              avatar: profileData?.avatar,
              description: profileData?.description
            } as EnrichedUser
          };
        } catch (error) {
          console.warn(`Failed to enrich user ${did}:`, error);
          return {
            index: actualIndex,
            enrichedUser: { did } as EnrichedUser
          };
        }
      })
    );
    
    // Update the users array with enriched data from this batch
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        enrichedUsers[result.value.index] = result.value.enrichedUser;
      }
    });
    
    // Trigger UI update with current progress
    onUpdate([...enrichedUsers]);
    
    // Small delay between batches to avoid rate limiting and allow UI updates
    if (i + BATCH_SIZE < userDids.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Cache the final enriched data
  setCachedEnrichedData(enrichedUsers);
  console.log('Progressive enrichment completed and cached');
};