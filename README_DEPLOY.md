Deployment quick steps

This project contains a GitHub Actions workflow to build and deploy to Vercel on pushes to `main`.

To enable automatic deploys:
1. Add the following repository secrets in GitHub (Repository → Settings → Secrets → Actions):
   - `VERCEL_TOKEN` — a Vercel personal token with project deploy permissions
   - `VERCEL_ORG_ID` — (optional) your Vercel organization id
   - `VERCEL_PROJECT_ID` — (optional) your Vercel project id

2. Push to `main` (the Action runs on push):
   - git add . && git commit -m "Enable GH Actions Vercel deploy" && git push origin main

If you prefer to deploy locally using the vercel CLI, use:

```bash
# install vercel CLI
npm i -g vercel

# export token (if using CLI auth)
export VERCEL_TOKEN="<your token>"

# run the included deploy script
./scripts/deploy_vercel.sh --prod
```

Security: never check tokens or service keys into the repository. Use GitHub Secrets.
