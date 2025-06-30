// deno-lint-ignore-file
import React, { useState, useEffect } from 'react';
import { oauthClient } from './oauth.ts';
import OAuthUI from './oauthUI.tsx';
import { WalletConnector } from './WalletConnector.tsx';
import type { OAuthSession } from '@atproto/oauth-client-browser';

const AuthLinker: React.FC = () => {
  const [oauthSession, setOauthSession] = useState<OAuthSession | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const initRes = await oauthClient.init();
      setOauthSession(initRes?.session || null);
    };
    fetchSession();
  }, []);

  return (
    <div>
      {oauthSession ? (
        <div>
          <p>✅ authenticated as: <b>{oauthSession.sub}</b></p>
          <OAuthUI oauthSession={oauthSession} onSessionChange={setOauthSession} />
          <WalletConnector 
            isAuthenticated={!!oauthSession} 
            did={oauthSession?.sub} 
            oauth={oauthSession} 
          />
        </div>
      ) : (
        <OAuthUI oauthSession={oauthSession} onSessionChange={setOauthSession} />
      )}
    </div>
  );
};

export default AuthLinker;