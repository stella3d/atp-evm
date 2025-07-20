import { BrowserOAuthClient, type OAuthClientMetadataInput } from '@atproto/oauth-client-browser'
import { appName } from "./constants.ts";

const prodDomain = 'https://wallet-link.stellz.club';
const devDomain = 'http://127.0.0.1:5173';
const isProduction = import.meta.env.PROD;

// Extract ngrok URL from Vite's allowedHosts if available
const getNgrokUrl = () => {
  // In development, check if we're running on an ngrok domain
  if (!isProduction && typeof globalThis !== 'undefined' && globalThis.location) {
    const hostname = globalThis.location.hostname;
    if (hostname.includes('.ngrok-free.app') || hostname.includes('.ngrok.io')) {
      return `https://${hostname}`;
    }
  }
  return null;
};

const ngrokUrl = getNgrokUrl();
const effectiveDevDomain = ngrokUrl || devDomain;
const effectiveDevClientId = `${effectiveDevDomain}/client-metadata-dev.json`;

const sharedConfig: Readonly<Pick<OAuthClientMetadataInput,
  "scope" | "grant_types" | "response_types" | "application_type" | 
  "token_endpoint_auth_method" | "dpop_bound_access_tokens"
>> = {
  scope: "atproto transition:generic",
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  application_type: "web",
  token_endpoint_auth_method: "none",
  dpop_bound_access_tokens: true,
};

const config: Readonly<OAuthClientMetadataInput> = {
  ...(isProduction
    ? {
        client_id: `${prodDomain}/client-metadata.json`,
        client_name: appName,
        client_uri: prodDomain,
        redirect_uris: [prodDomain],
      }
    : {
        client_id: effectiveDevClientId,
        client_name: `${appName} (dev)`,
        client_uri: effectiveDevDomain,
        redirect_uris: [effectiveDevDomain],
      }
  ),
  ...sharedConfig,
};

export const oauthClient = new BrowserOAuthClient({
  clientMetadata: config,
  handleResolver: "https://bsky.social",
});
