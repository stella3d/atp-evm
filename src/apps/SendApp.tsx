import '../App.css'
import { useEffect, useState } from 'react';

import { oauthClient } from "../shared/oauth.ts";
import { OAuthSession } from "@atproto/oauth-client-browser";
import { SearchUsers } from "./send/SearchUsers.tsx";
import OAuthUI from "../shared/oauthUI.tsx";

function SendApp() {
  const [oauthSession, setOauthSession] = useState<OAuthSession | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const initRes = await oauthClient.init();
      setOauthSession(initRes?.session || null);
    };
    fetchSession();
  }, []);

  return (
    <>
      <h1>DID Pay Demo</h1>
      <p>This demo lets you send value to a recipient based on their ATProto DID & linked Ethereum wallet.</p>
      <br/>
	  <SearchUsers />
    </>
  );
}

export default SendApp;
