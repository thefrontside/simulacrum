export interface RuleMeta {
  enabled: boolean;
  order?: number;
  stage?: "login_success"; // TODO add other Auth0 stages
}
