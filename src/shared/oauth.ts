import { BrowserOAuthClient, type OAuthClientMetadataInput } from '@atproto/oauth-client-browser'

const prodDomain = 'https://wallet-link.stellz.club';
const devDomain = 'http://127.0.0.1:5173';
const isProduction = import.meta.env.PROD;

const config: Readonly<OAuthClientMetadataInput> = isProduction ? {
  "client_id": `${prodDomain}/client-metadata.json`,
  "client_name": "Atproto Wallet Linker",
  "client_uri": prodDomain,
  "redirect_uris": [prodDomain],
  "scope": "atproto transition:generic",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
} : {
  "client_id": `http://localhost`,
  "client_name": "Atproto Wallet Linker",
  "client_uri": devDomain,
  "redirect_uris": [devDomain],
  "scope": "atproto",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
};

export const oauthClient = new BrowserOAuthClient({
  clientMetadata: config,
  handleResolver: "https://bsky.social",
});
