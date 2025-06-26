import { BrowserOAuthClient, type OAuthClientMetadataInput } from '@atproto/oauth-client-browser'

const prodDomain = 'https://wallet-link.stellz.club';
const isProduction = import.meta.env.PROD;

const getConfig = async (): Promise<undefined | Readonly<OAuthClientMetadataInput>> => {
  if (isProduction) {
    const res = await fetch(`${prodDomain}/client-metadata.json`);
    if (!res.ok) {
      throw new Error(`Failed to fetch client metadata: ${res.status} ${res.statusText}`);
    }
    return await res.json() as OAuthClientMetadataInput;
  } else { 
    return undefined; 
  }
}

const config = await getConfig();
export const oauthClient = new BrowserOAuthClient({
  clientMetadata: config,
  handleResolver: "https://bsky.social",
});
