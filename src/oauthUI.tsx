import React, { useState } from 'react';
import { oauthClient } from './oauth.ts';
import type { OAuthSession } from '@atproto/oauth-client-browser';

interface OAuthUIProps {
  oauthSession?: OAuthSession | null;
  onSessionChange?: (session: OAuthSession | null) => void;
}

const OAuthUI: React.FC<OAuthUIProps> = ({ oauthSession, onSessionChange }) => {
  const [handle, setHandle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await oauthClient.signIn(handle, {
        prompt: 'login',
        signal: new AbortController().signal,
      });
    } catch (err) {
      console.log('oauth login cancelled:', err);
    }
  };

  const handleLogout = async () => {
    try {
      if (oauthSession?.did) {
        await oauthClient.revoke(oauthSession.did);
        onSessionChange?.(null);
      }
    } catch (err) {
      console.log('oauth logout error:', err);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {!oauthSession && (
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="enter your Bluesky handle or DID"
            style={{ fontSize: '18px', padding: '6px', width: '300px', textAlign: 'center', marginRight: '8px' }}
          />
        )}
        {!oauthSession && <button type="submit">Login</button>}
        {oauthSession && (
          <button 
            type="button" 
            onClick={handleLogout}
            style={{ marginLeft: '8px' }}
          >
            Logout (on ATProto side)
          </button>
        )}
      </form>
    </div>
  );
};

export default OAuthUI;
