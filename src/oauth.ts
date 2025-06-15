import { BrowserOAuthClient, type OAuthClientMetadataInput } from '@atproto/oauth-client-browser'

export const config: Readonly<OAuthClientMetadataInput> = {
  // Must be the same URL as the one used to obtain this JSON object
  "client_id": "http://localhost",
  "client_name": "Atproto Wallet Linker",
  "client_uri": "http://127.0.0.1:5173",
  "logo_uri": "https://atp-evm.stellz.club/logo.png",
  "tos_uri": "https://atp-evm.stellz.club/tos",
  "policy_uri": "https://atp-evm.stellz.club/policy",
  "redirect_uris": ["http://127.0.0.1:5173"],
  "scope": "atproto",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
};

export const oauthClient = new BrowserOAuthClient({
  clientMetadata: config,
  handleResolver: "https://plc.directory",
})