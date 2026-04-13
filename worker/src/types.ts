export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  FRONTEND_ORIGIN: string;
  IMAGES: R2Bucket;
  TWITTER_API_KEY?: string;
  TWITTER_API_SECRET?: string;
  TWITTER_ACCESS_TOKEN?: string;
  TWITTER_ACCESS_TOKEN_SECRET?: string;
};
