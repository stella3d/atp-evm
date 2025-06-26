import { BrowserOAuthClient, type OAuthClientMetadataInput } from '@atproto/oauth-client-browser'

const prodDomain = 'https://wallet-link.stellz.club';
const isProduction = import.meta.env.PROD;

const config: Readonly<OAuthClientMetadataInput> | undefined = isProduction ? {
  "client_id": `${prodDomain}/client-metadata.json`,
  "client_name": "Atproto Wallet Linker",
  "client_uri": prodDomain,
  "logo_uri": `${prodDomain}/logo.png`,
  "tos_uri": `${prodDomain}/tos`,
  "policy_uri": `${prodDomain}/policy`,
  "redirect_uris": [prodDomain],
  "scope": "atproto transition:generic",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
} : undefined;

export const oauthClient = new BrowserOAuthClient({
  clientMetadata: config,
  handleResolver: "https://bsky.social",
});
