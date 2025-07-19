/// <reference lib="deno.ns" />
import type { Plugin } from 'vite';

export function generateDevClientMetadata(): Plugin {
  const filename = 'client-metadata-dev.json';

  return {
    name: 'generate-dev-client-metadata',
    configureServer(server) {
      // Generate the dev client metadata when server starts
      const generateMetadata = async () => {
        const { config } = server;
        const host = config.server?.host || 'localhost';
        const port = config.server?.port || 5173;

        // check if we're setup to run on ngrok by looking at allowedHosts
        const allowedHosts = config.server?.allowedHosts || [];
        const ngrokHost = Array.isArray(allowedHosts) 
          ? allowedHosts.find((host: string) => 
              host.includes('.ngrok-free.app') || host.includes('.ngrok.io')
            ) 
		  : null;

        let baseUrl: string;
		let clientId: string;
        if (ngrokHost) {
          baseUrl = `https://${ngrokHost}`;
		  clientId = `${baseUrl}/${filename}`;
          console.log(`🔗 using ngrok URL for OAuth config: ${baseUrl}`);
        } else {
          baseUrl = `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`;
		  clientId = 'http://localhost'; // magic localhost value for atp oauth
          console.log(`🏠 using local URL for OAuth config: ${baseUrl}`);
        }

        const metadata = {
          client_id: clientId,
          client_name: "@Pay Wallet Linker (dev)",
          client_uri: baseUrl,
          redirect_uris: [baseUrl],
          scope: "atproto transition:generic",
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          token_endpoint_auth_method: "none",
          application_type: "web",
          dpop_bound_access_tokens: true
        };

        try {
		  // 'localhost' doesn't actually serve a config file          
		  if (ngrokHost) {
			const outputPath = `${Deno.cwd()}/public`;
            await Deno.mkdir(outputPath, { recursive: true });

			const filePath = `${outputPath}/${filename}`;
			await Deno.writeTextFile(filePath, JSON.stringify(metadata, null, 2));
			console.log(`generated dev client metadata for ngrok: ${filePath}`);
		  }
        } catch (error) {
          console.warn('failed to generate dev client metadata:', error);
        }
      };

      // generate on server start
      generateMetadata();
    }
  };
}
