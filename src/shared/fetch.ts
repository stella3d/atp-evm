import type { DefinedDidString } from "./common.ts";

export const fetchUsersWithAddressRecord = async (): Promise<DefinedDidString[]> => {
  type ResponseShape = { repos: { repo: DefinedDidString }[] };
  // using regular fetch skips needing OAuth permissions
  const res = await fetch('https://relay1.us-west.bsky.network/xrpc/com.atproto.sync.listReposByCollection?collection=club.stellz.evm.addressControl');
  const data: ResponseShape = await res.json();
  return data.repos.map(r => r.repo);
}