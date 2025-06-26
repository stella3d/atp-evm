import { BrowserOAuthClient, type OAuthClientMetadataInput } from '@atproto/oauth-client-browser'

const isProduction = import.meta.env.PROD;
const baseUrl = isProduction ? 'https://atp-wallet-link.stellz.club' : 'http://127.0.0.1:5173';
const clientId = isProduction ? 'https://atp-wallet-link.stellz.club' : 'http://localhost';

const scope = isProduction ? 'atproto' : 'atproto transition:generic';

export const config: Readonly<OAuthClientMetadataInput> = {
  // Must be the same URL as the one used to obtain this JSON object
  "client_id": clientId,
  "client_name": "Atproto Wallet Linker",
  "client_uri": baseUrl,
  "logo_uri": "https://atp-wallet-link.stellz.club/logo.png",
  "tos_uri": "https://atp-wallet-link.stellz.club/tos",
  "policy_uri": "https://atp-wallet-link.stellz.club/policy",
  "redirect_uris": [baseUrl],
  "scope": scope,
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
};

let oauthClientInternal = new BrowserOAuthClient({
  clientMetadata: config,
  handleResolver: "https://bsky.social",
});

//let oauthInit = await oauthClientInternal.init();
//console.log('OAuth initialization:', oauthInit);

export const oauthClient = oauthClientInternal;


// did:plc:7mnpet2pvof2llhpcwattscf