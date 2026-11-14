// The commit that was built is baked into the app, so /api/health shows
// exactly which version is live (useful after every deployment).
const commit = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" creates a small self-contained server for the Docker image.
  // Vercel ignores it and deploys the app as serverless functions instead.
  output: 'standalone',
  poweredByHeader: false,
  env: {
    APP_VERSION: commit ? commit.slice(0, 7) : 'dev',
  },
};

export default nextConfig;
