# Deployment setup guide

This is done once by one team member. After it, every pull request gets a preview
deployment and every merge to `main` goes to production automatically.

You need free accounts on GitHub, Vercel and Neon.

## 1. GitHub repository

1. Create a new repository on GitHub (public or private).
2. Push the project to it with `main` as the default branch.
3. Add the other two members: **Settings → Collaborators → Add people**.

## 2. Databases on Neon

Neon is hosted PostgreSQL with a free plan and "branches", which give the preview
environment its own copy of the database.

1. Create a project on https://neon.tech, choosing the region closest to India.
2. The default branch (`main`) is the **production** database. Open **Connection
   details**, choose the **pooled** connection string, and copy it. It looks like
   `postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`.
3. Create a branch named `preview` from `main` and copy its pooled connection string too.

Keep both strings private. They are passwords.

## 3. Vercel project

Deployments are made by the pipeline through the Vercel CLI, so you do not connect
the repository to Vercel's Git integration (the `vercel.json` file turns Vercel's
own Git deployments off).

1. Install the CLI and log in: `npm install --global vercel` then `vercel login`.
2. In the project folder run `vercel link` and create a new project. This creates
   `.vercel/project.json` containing `orgId` and `projectId` (the folder is git-ignored).
3. Add the database URL for each environment:
   ```bash
   vercel env add DATABASE_URL production   # paste the Neon main (production) string
   vercel env add DATABASE_URL preview      # paste the Neon preview string
   ```
4. Create a token: Vercel dashboard → **Account Settings → Tokens → Create**.
5. Preview links are protected by Vercel login by default, which would make the
   pipeline's health check fail. In the project go to **Settings → Deployment
   Protection** and either:
   - turn off **Vercel Authentication** (simplest for a class project), or
   - keep it on and create a **Protection Bypass for Automation** secret, then save
     it in GitHub as `VERCEL_AUTOMATION_BYPASS_SECRET` (step 4).
6. Do one manual production deploy so the project gets its address:
   `vercel --prod`. Note the production URL, for example `https://dukaan-xyz.vercel.app`.
   Its pages show an error until the pipeline's first production run creates the
   tables; that is expected.

## 4. GitHub secrets and variables

Repository **Settings → Secrets and variables → Actions**.

Secrets:

| Name | Value |
|---|---|
| `VERCEL_TOKEN` | the token from step 3.4 |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |
| `PRODUCTION_DATABASE_URL` | Neon main branch string |
| `PREVIEW_DATABASE_URL` | Neon preview branch string |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | only if you kept Vercel Authentication on |

Variables (the **Variables** tab):

| Name | Value |
|---|---|
| `PRODUCTION_URL` | your production address, for example `https://dukaan-xyz.vercel.app` |

## 5. Protect the main branch

**Settings → Branches → Add branch ruleset** (or "Add rule") for `main`:

- Require a pull request before merging, with at least 1 approval
- Require status checks to pass: select **Lint, test and build** and
  **Docker build and smoke test** (they appear after the pipeline has run once)
- Block force pushes

Now nobody can push straight to `main`, and a pull request with a failing test
cannot be merged, so it can never be deployed.

Optional: in **Settings → Environments → production** add yourselves as required
reviewers, so production deployments wait for a click of approval.

## 6. Check that it works

1. Create a branch, change some text, push it, and open a pull request.
2. In the **Actions** tab watch the pipeline: tests, Docker, then preview deploy.
3. The pipeline comments the preview link on the pull request. Open it; the sample
   products are there.
4. Merge the pull request. The pipeline deploys production, then health-checks it.
5. Open `https://YOUR-PROJECT.vercel.app/api/health`. The `version` field shows the
   commit that is now live.
6. After the first merge, the Docker image appears under the repository's
   **Packages** section on GitHub.

## Troubleshooting

| Problem | Fix |
|---|---|
| Health check gets 401 on the preview | Step 3.5: turn off Vercel Authentication or add the bypass secret |
| `DATABASE_URL is not set` in the deployed app | Step 3.3: add the variable for that environment, then redeploy |
| `Error: No existing credentials found` from the Vercel CLI | `VERCEL_TOKEN` secret is missing or expired |
| Migration fails in the pipeline | Fix the SQL in a new migration file; do not edit merged ones |
| Status checks not listed in step 5 | Let the pipeline run once on any branch first |
