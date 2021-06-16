export interface Options {
  port?: number;
  audience: string;
}

export type QueryParams = {
  state: string;
  code: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  client_id: string;
  nonce: string;
  code_challenge_method: string;
  response_type: string;
  response_mode: "query" | "web_message" | "fragment";
  auth0Client: string;
  audience: string;
};
