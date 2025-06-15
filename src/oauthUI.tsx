import React, { useState } from 'react';
import { oauthClient } from './oauth';

const OAuthUI: React.FC = () => {
  const [handle, setHandle] = useState('');

  let oauthInit = oauthClient.init();
  console.log('OAuth initialization:', oauthInit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await oauthClient.signIn(handle, {
        state: 'some value needed later',
        prompt: 'login',
        signal: new AbortController().signal,
      });
      console.log('oauth login ever executed');
    } catch (err) {
      console.log('The user aborted the authorization process by navigating "back"');
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="Bluesky handle or DID"
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default OAuthUI;
