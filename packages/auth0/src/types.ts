export type Auth0QueryParams = {
  state: string;
  code: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  client_id: string;
  nonce: string;
  simulationId: string;
  code_challenge_method: string;
  response_type: string;
  response_mode: "query" | "web_message" | "fragment";
  auth0Client: string;
};
