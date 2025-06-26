import { BrowserOAuthClient, type OAuthClientMetadataInput } from '@atproto/oauth-client-browser'

const prodDomain = 'https://wallet-link.stellz.club';
const isProduction = import.meta.env.PROD;

const baseUrl = isProduction ? prodDomain: 'http://127.0.0.1:5173';
const clientId = isProduction ? prodDomain : 'http://localhost';
const scope = isProduction ? 'atproto' : 'atproto transition:generic';

export const config: Readonly<OAuthClientMetadataInput> = {
  // Must be the same URL as the one used to obtain this JSON object
  "client_id": clientId,
  "client_name": "Atproto Wallet Linker",
  "client_uri": baseUrl,
  "logo_uri": `${prodDomain}/logo.png`,
  "tos_uri": `${prodDomain}/tos`,
  "policy_uri": `${prodDomain}/policy`,
  "redirect_uris": [baseUrl],
  "scope": scope,
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
