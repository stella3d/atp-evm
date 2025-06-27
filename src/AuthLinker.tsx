// deno-lint-ignore-file
import React, { useState, useEffect } from 'react';
import { oauthClient } from './oauth.ts';
import OAuthUI from './oauthUI.tsx';
import { WalletConnector } from './WalletConnector.tsx';
import type { OAuthSession } from '@atproto/oauth-client-browser';

const AuthLinker: React.FC = () => {
  const [oauthSession, setOauthSession] = useState<OAuthSession | null>(null);

  // this is just to make testing easier.
  if (oauthSession?.did) {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthRedoParam = urlParams.get('oauthRedo');
    if (oauthRedoParam === 'true') {
      oauthClient.revoke(oauthSession.did);
      setOauthSession(null);
    }
  }

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
          <p>✅ authenticated on ATProto side as:</p>
          <p>{oauthSession.sub}</p>
          <WalletConnector 
            isAuthenticated={!!oauthSession} 
            did={oauthSession?.sub} 
            oauth={oauthSession} 
          />
        </div>
      ) : (
        <OAuthUI />
      )}
    </div>
  );
};

export default AuthLinker;