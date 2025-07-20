import type { DidString, EnrichedUser, EnrichedUserCacheEntry, AddressControlRecordWithMeta } from "./common.ts";
import { isDidString } from "./common.ts";
import { LocalstorageTtlCache } from "./LocalstorageTtlCache.ts";

// Cache configuration
const CACHE_DURATION = import.meta.env.DEV 
  ? 30 * 60 * 1000 // 30 minutes in development
  : 5 * 60 * 1000;  // 5 minutes in production

// Handle resolution cache duration
const HANDLE_RESOLUTION_CACHE_DURATION = import.meta.env.DEV 
  ? 2 * 60 * 60 * 1000 // 2 hours in development
  : 1 * 60 * 60 * 1000; // 1 hour in production

const CACHE_KEY = 'users_with_address_record';
const ENRICHED_CACHE_KEY = 'enriched_users_data_v2';

// Batch size for bulk operations
const BATCH_SIZE = 20;

interface CacheEntry {
  data: DidString[];
  timestamp: number;
}

const getCachedData = (): DidString[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if ((now - entry.timestamp) < CACHE_DURATION) {
      console.log('using cached users data from localStorage');
      return entry.data;
    } else {
      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.error('error reading from cache:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

const setCachedData = (data: DidString[]): void => {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (error) {
    console.error('error writing to cache:', error);
  }
};

export const fetchUsersWithAddressRecord = async (): Promise<DidString[]> => {
  // Check cache first
  const cachedData = getCachedData();
  if (cachedData) {
    return cachedData;
  }

  // Cache miss or expired, fetch new data
  type ResponseShape = { repos: { did: DidString }[] };
  // using regular fetch skips needing OAuth permissions
  const res = await fetch('https://relay1.us-west.bsky.network/xrpc/com.atproto.sync.listReposByCollection?collection=club.stellz.evm.addressControl');
  const data: ResponseShape = await res.json();
  const users = data.repos.map(r => r.did);

  // Cache the new data
  setCachedData(users);
  
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
      //console.log('using cached enriched users data from localStorage');
      const enrichedData = entry.data.map(user => ({
        ...user,
        createdAt: user.createdAt ? new Date(user.createdAt) : undefined
      }));
      return enrichedData;
    } else {
      // Cache expired, remove it
      localStorage.removeItem(ENRICHED_CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.error('error reading enriched data from cache:', error);
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
    console.error('error writing enriched data to cache:', error);
  }
};

// Batch process DIDs to resolve handles and profile info
const batchProcessDids = async (dids: DidString[]): Promise<EnrichedUser[]> => {
  const enrichedUsers: EnrichedUser[] = [];
  
  // Process in batches of BATCH_SIZE
  for (let i = 0; i < dids.length; i += BATCH_SIZE) {
    const batch = dids.slice(i, i + BATCH_SIZE);
    //console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(dids.length / BATCH_SIZE)}`);
    
    // First, resolve DID documents and extract candidate handles
    const didProcessingResults = await Promise.allSettled(
      batch.map(async (did) => {
        try {
          const didDoc = await resolveDid(did);
          const candidateHandle = extractHandleFromDidDoc(didDoc);
          const pds = extractPdsFromDidDoc(didDoc);
          
          return {
            did,
            candidateHandle,
            pds,
            didDoc
          };
        } catch (error) {
          console.warn(`Failed to resolve DID document for ${did}:`, error);
          return { did, candidateHandle: undefined, pds: undefined, didDoc: null };
        }
      })
    );
    
    // Collect handles that need verification
    const handlesToVerify: Array<{ handle: string; did: DidString }> = [];
    const processedResults = didProcessingResults.map((result) => {
      if (result.status === 'fulfilled' && result.value.candidateHandle) {
        handlesToVerify.push({
          handle: result.value.candidateHandle,
          did: result.value.did
        });
      }
      return result.status === 'fulfilled' ? result.value : null;
    }).filter((result): result is NonNullable<typeof result> => result !== null);
    
    // Batch verify all handles for this batch
    const verificationResults = await batchVerifyHandles(handlesToVerify);
    
    // Collect all verified handles for batched profile fetching
    const verifiedHandles: string[] = [];
    processedResults.forEach(({ candidateHandle }) => {
      if (candidateHandle && verificationResults.get(candidateHandle) === true) {
        verifiedHandles.push(candidateHandle);
      }
    });
    
    // Fetch all profiles in batches
    const allProfileData = new Map<string, BskyProfileMinimal>();
    for (let i = 0; i < verifiedHandles.length; i += PROFILE_BATCH_SIZE) {
      const handleBatch = verifiedHandles.slice(i, i + PROFILE_BATCH_SIZE);
      try {
        const batchProfiles = await fetchBlueskyProfiles(handleBatch);
        // Merge into the main profile map
        batchProfiles.forEach((profile, handle) => {
          allProfileData.set(handle, profile);
        });
      } catch (error) {
        console.warn(`Failed to fetch profile batch:`, error);
      }
    }
    
    // Now create enriched users using the batched profile data
    const finalResults = processedResults.map(({ did, candidateHandle, pds }) => {
      let handle: string | undefined = undefined;
      let profileData: BskyProfileMinimal | null = null;
      
      // Only use handle if it was verified
      if (candidateHandle && verificationResults.get(candidateHandle) === true) {
        handle = candidateHandle;
        profileData = allProfileData.get(handle) || null;
      } else if (candidateHandle) {
        console.warn(`handle ${candidateHandle} failed verification for DID ${did} - hiding profile`);
      }
      
      return {
        did,
        handle,
        handleVerified: !!handle, // True only if handle exists and was verified
        pds,
        displayName: profileData?.displayName,
        avatar: profileData?.avatar,
        description: profileData?.description,
        createdAt: profileData?.createdAt,
        followersCount: profileData?.followersCount,
        postsCount: profileData?.postsCount
      } as EnrichedUser;
    });
    
    // Add successful results to the enriched users array
    enrichedUsers.push(...finalResults);
    
    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < dids.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return enrichedUsers;
};

interface DidDocument {
  alsoKnownAs?: string[];
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
  [key: string]: unknown;
}

// DID document cache with 30 minute TTL
const didDocumentCache = new LocalstorageTtlCache<DidDocument>(30 * 60 * 1000);

const fetchDidDocument = async (did: DidString): Promise<DidDocument> => {
  let response: Response;
  if (did.startsWith('did:web:')) {
    const didDomain = did.slice(8);
    response = await fetch(`https://${didDomain}/.well-known/did.json`);
  } else {
    response = await fetch(`https://plc.directory/${did}`);
  }

  if (!response.ok) {
    throw new Error(`failed to resolve DID: ${response.status}`);
  }

  return await response.json();
}
const resolveDid = async (did: DidString): Promise<DidDocument> => {
  // Check cache first
  const cacheKey = `${did}_doc`;
  const cachedDidDoc = didDocumentCache.get(cacheKey);
  if (cachedDidDoc) {
    //console.log(`using cached DID document for ${did}`);
    return cachedDidDoc;
  }
  
  const didDoc = await fetchDidDocument(did);
  didDocumentCache.set(cacheKey, didDoc);
  return didDoc;
};

// Extract handle from DID document (UNSAFE - needs verification)
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

// Handle resolution cache using LocalStorage with TTL
const handleResolutionCache = new LocalstorageTtlCache<string>(HANDLE_RESOLUTION_CACHE_DURATION);

// Cache for profile data to avoid duplicate API calls
const profileCache = new Map<string, { profile: BskyProfileMinimal; timestamp: number }>();
const PROFILE_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Cache for handle verification results using LocalStorage with TTL
const verificationCache = new LocalstorageTtlCache<boolean>(HANDLE_RESOLUTION_CACHE_DURATION);

// Resolve a handle to DID with caching
const resolveHandleWithCache = async (handle: string): Promise<string | null> => {
  // Check cache first
  const cachedDid = handleResolutionCache.get(`handle:${handle}`);
  if (cachedDid) {
    console.log(`Handle ${handle} resolved from cache`);
    return cachedDid;
  }
  
  try {
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`
    );
    
    if (!response.ok) // if their handle doesn't resolve, don't show the profile
      return null;
    
    
    const data = await response.json();
    const resolvedDid = data.did;
    
    // Cache the result
    handleResolutionCache.set(`handle:${handle}`, resolvedDid);
    
    return resolvedDid;
  } catch (error) {
    console.warn(`Error resolving handle ${handle}:`, error);
    return null;
  }
};

// Public function to resolve user identifier (handle or DID) to a DID
export const resolveUserIdentifier = async (identifier: string): Promise<DidString | null> => {
  const trimmed = identifier.trim();
  
  // If it's already a DID, return it
  if (isDidString(trimmed)) {
    return trimmed as DidString;
  }
  
  // If it looks like a handle, resolve it to a DID using cached function
  if (trimmed.includes('.') && !trimmed.startsWith('did:') && trimmed.length > 3) {
    const resolvedDid = await resolveHandleWithCache(trimmed);
    return resolvedDid && isDidString(resolvedDid) ? resolvedDid as DidString : null;
  }
  
  return null;
};

// Verify that a handle actually resolves to the expected DID using ATProto
const verifyHandleOwnership = async (handle: string, expectedDid: DidString): Promise<boolean> => {
  // Check verification cache first
  const cacheKey = `verification:${handle}:${expectedDid}`;
  const cached = verificationCache.get(cacheKey);
  
  if (cached !== null) {
    return cached;
  }
  
  const resolvedDid = await resolveHandleWithCache(handle);
  
  if (!resolvedDid) {
    const result = false;
    verificationCache.set(cacheKey, result);
    return result;
  }
  
  // Verify the resolved DID matches what we expect
  const matches = resolvedDid === expectedDid;
  if (!matches) {
    console.warn(`Handle ${handle} resolved to ${resolvedDid} but expected ${expectedDid}`);
  }
  
  // Cache the verification result
  verificationCache.set(cacheKey, matches);
  
  return matches;
};

// Batch verify handles to avoid rate limiting (max 6 concurrent requests)
const HANDLE_VERIFICATION_BATCH_SIZE = 6;

const batchVerifyHandles = async (
  handleDidPairs: Array<{ handle: string; did: DidString }>
): Promise<Map<string, boolean>> => {
  const results = new Map<string, boolean>();
  
  // Process in batches of 6 to avoid rate limiting
  for (let i = 0; i < handleDidPairs.length; i += HANDLE_VERIFICATION_BATCH_SIZE) {
    const batch = handleDidPairs.slice(i, i + HANDLE_VERIFICATION_BATCH_SIZE);
    
    const batchResults = await Promise.allSettled(
      batch.map(async ({ handle, did }) => {
        const isValid = await verifyHandleOwnership(handle, did);
        return { handle, isValid };
      })
    );
    
    // Collect results from this batch
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.set(result.value.handle, result.value.isValid);
      } else {
        // If verification failed, mark as invalid
        const failedHandle = batch[batchResults.indexOf(result)]?.handle;
        if (failedHandle) {
          results.set(failedHandle, false);
        }
      }
    });
    
    // Small delay between batches to avoid rate limiting
    if (i + HANDLE_VERIFICATION_BATCH_SIZE < handleDidPairs.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
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
  
  return pdsService?.serviceEndpoint;
};

type BskyProfileMinimal = {
  avatar?: string;
  createdAt: Date;
  displayName?: string;
  description?: string;
  followersCount: number;
  postsCount: number;
};

// Batch size for profile fetching
const PROFILE_BATCH_SIZE = 10;

// Fetch multiple Bluesky profiles in a single batched request
const fetchBlueskyProfiles = async (handles: string[]): Promise<Map<string, BskyProfileMinimal>> => {
  const profileMap = new Map<string, BskyProfileMinimal>();
  const uncachedHandles: string[] = [];
  const now = Date.now();
  
  // Check cache first and collect uncached handles
  handles.forEach(handle => {
    const cached = profileCache.get(handle);
    if (cached && (now - cached.timestamp) < PROFILE_CACHE_DURATION) {
      profileMap.set(handle, cached.profile);
    } else {
      uncachedHandles.push(handle);
    }
  });
  
  // If all handles are cached, return early
  if (uncachedHandles.length === 0) {
    console.log(`All ${handles.length} profiles found in cache`);
    return profileMap;
  }
  
  console.log(`Fetching ${uncachedHandles.length} uncached profiles (${handles.length - uncachedHandles.length} from cache)`);
  
  try {
    // Build the query string with multiple actors
    const actors = uncachedHandles.map(handle => encodeURIComponent(handle)).join('&actors=');
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?actors=${actors}`
    );

    if (!response.ok) {
      throw new Error(`failed to fetch profiles: ${response.status}`);
    }
    
    const data = await response.json();
    const profiles = data.profiles || [];

    // Map profiles back to handles and cache them
    profiles.forEach((profile: {
      handle?: string;
      createdAt?: string;
      displayName?: string;
      avatar?: string;
      description?: string;
      followersCount?: number;
      postsCount?: number;
    }) => {
      if (profile.handle) {
        const profileData = {
          createdAt: new Date(profile.createdAt || ''),
          displayName: profile.displayName,
          avatar: profile.avatar,
          description: profile.description,
          followersCount: profile.followersCount || 0,
          postsCount: profile.postsCount || 0
        };
        
        // Add to result map
        profileMap.set(profile.handle, profileData);
        
        // Cache the result
        profileCache.set(profile.handle, {
          profile: profileData,
          timestamp: now
        });
      }
    });

    return profileMap;
  } catch (error) {
    console.warn(`failed to fetch batched profiles for handles: ${uncachedHandles.join(', ')}:`, error);
    return profileMap; // Return what we have from cache on error
  }
};

// Cache duration for address control records
const ADDRESS_RECORDS_CACHE_DURATION = 6 * 60 * 1000; // 6 minutes

// Fetch address control records from user's PDS
export const fetchAddressControlRecords = async (
  did: DidString, 
  pds: string
): Promise<AddressControlRecordWithMeta[]> => {
  const cacheKey = `listRecords_${did}`;
  
  // Check cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      //console.log(`found cached value for ${cacheKey}`);
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ADDRESS_RECORDS_CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.error('error reading from address records cache:', error);
    localStorage.removeItem(cacheKey);
  }

  //console.log(`no cached value for ${cacheKey}`);

  try {
    // Extract hostname from PDS URL
    const pdsUrl = new URL(pds);
    const pdsHost = pdsUrl.hostname;
    
    //console.log(`fetching address records for ${did} from PDS: ${pdsHost}`);
    
    const response = await fetch(
      `https://${pdsHost}/xrpc/com.atproto.repo.listRecords?repo=${did}&collection=club.stellz.evm.addressControl&limit=16`
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch address control records: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch address control records: ${response.status}`);
    }
    
    const data = await response.json();
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
  userDids: DidString[],
  onUpdate: (users: EnrichedUser[]) => void
): Promise<void> => {
  // Check if we have cached enriched data first
  const cachedData = getCachedEnrichedData();
  if (cachedData && cachedData.length > 0) {
    //console.log('using cached enriched data for progressive update');
    // Filter cached data to only include requested users
    const requestedCachedUsers = cachedData.filter(user => userDids.includes(user.did));
    if (requestedCachedUsers.length === userDids.length) {
      // All requested users are already cached
      onUpdate(requestedCachedUsers);
      return;
    } else if (requestedCachedUsers.length > 0) {
      // Some users are cached, start with them and enrich the rest
      onUpdate(requestedCachedUsers);
      const uncachedDids = userDids.filter(did => !cachedData.some(user => user.did === did));
      if (uncachedDids.length === 0) {
        return; // All done
      }
      userDids = uncachedDids; // Only process uncached users
    }
  }

  // Start with basic user objects for uncached users
  const enrichedUsers: EnrichedUser[] = userDids.map(did => ({ did }));
  
  // Process in batches and update as we go
  for (let i = 0; i < userDids.length; i += BATCH_SIZE) {
    const batch = userDids.slice(i, i + BATCH_SIZE);
    //console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(userDids.length / BATCH_SIZE)} for progressive enrichment`);
    
    // First, resolve DID documents and extract candidate handles
    const didProcessingResults = await Promise.allSettled(
      batch.map(async (did, batchIndex) => {
        const actualIndex = i + batchIndex;
        try {
          const didDoc = await resolveDid(did);
          const candidateHandle = extractHandleFromDidDoc(didDoc);
          const pds = extractPdsFromDidDoc(didDoc);
          
          return {
            actualIndex,
            did,
            candidateHandle,
            pds
          };
        } catch (error) {
          console.warn(`Failed to resolve DID document for ${did}:`, error);
          return { 
            actualIndex, 
            did, 
            candidateHandle: undefined, 
            pds: undefined 
          };
        }
      })
    );
    
    // Collect handles that need verification
    const handlesToVerify: Array<{ handle: string; did: DidString }> = [];
    const processedResults = didProcessingResults.map((result) => {
      if (result.status === 'fulfilled') {
        if (result.value.candidateHandle) {
          handlesToVerify.push({
            handle: result.value.candidateHandle,
            did: result.value.did
          });
        }
        return result.value;
      }
      return null;
    }).filter((result): result is NonNullable<typeof result> => result !== null);
    
    // Batch verify all handles for this batch
    const verificationResults = await batchVerifyHandles(handlesToVerify);
    
    // Collect all verified handles for batched profile fetching
    const verifiedHandles: string[] = [];
    processedResults.forEach(({ candidateHandle }) => {
      if (candidateHandle && verificationResults.get(candidateHandle) === true) {
        verifiedHandles.push(candidateHandle);
      }
    });
    
    // Fetch all profiles in batches
    const allProfileData = new Map<string, BskyProfileMinimal>();
    for (let j = 0; j < verifiedHandles.length; j += PROFILE_BATCH_SIZE) {
      const handleBatch = verifiedHandles.slice(j, j + PROFILE_BATCH_SIZE);
      try {
        const batchProfiles = await fetchBlueskyProfiles(handleBatch);
        // Merge into the main profile map
        batchProfiles.forEach((profile, handle) => {
          allProfileData.set(handle, profile);
        });
      } catch (error) {
        console.warn(`Failed to fetch profile batch:`, error);
      }
    }
    
    // now create enriched users using the batched profile data
    const finalResults = processedResults.map(({ actualIndex, did, candidateHandle, pds }) => {
      let handle: string | undefined = undefined;
      let profileData: BskyProfileMinimal | null = null;
      
      // only use handle if it was verified
      if (candidateHandle && verificationResults.get(candidateHandle) === true) {
        handle = candidateHandle;
        profileData = allProfileData.get(handle) || null;
      } 
      
      return {
        index: actualIndex,
        enrichedUser: {
          did,
            handle,
            handleVerified: !!handle, // True only if handle exists and was verified
            pds,
            displayName: profileData?.displayName,
            avatar: profileData?.avatar,
            description: profileData?.description,
            createdAt: profileData?.createdAt,
            followersCount: profileData?.followersCount,
            postsCount: profileData?.postsCount
          } as EnrichedUser
        };
      });
    
    // Update the users array with enriched data from this batch
    finalResults.forEach((result) => {
      enrichedUsers[result.index] = result.enrichedUser;
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
  //console.log('Progressive enrichment completed and cached');
};