# Auto-Push to GitHub

This repository includes several ways to automatically push changes to GitHub:

## Option 1: NPM Script (Recommended)

The easiest way to auto-push is using the npm script:

```bash
npm run push
```

This will:
1. Stage all changes (`git add .`)
2. Commit with an auto-generated timestamp message
3. Push to the current branch on GitHub

To use a custom commit message:
```bash
npm run push:msg "Your custom message here"
```

## Option 2: PowerShell Script

You can run the PowerShell script directly:

```powershell
.\scripts\auto-push.ps1
```

Or with a custom message:
```powershell
.\scripts\auto-push.ps1 "Your custom commit message"
```

## Option 3: VS Code Tasks

If you're using VS Code or Cursor:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select "Auto Push to GitHub"

## Option 4: GitHub Actions (Automatic Deployment)

The repository includes a GitHub Actions workflow (`.github/workflows/auto-deploy.yml`) that:
- Automatically builds your app when you push to `main`
- Deploys to Netlify (if configured)

To set this up:
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add these secrets (use Netlify dashboard, not in code):
   - Netlify auth token
   - Netlify site ID
   - Clerk publishable key
   - Database connection string (server-side only)

## Option 5: Git Hook (Advanced)

A post-commit hook is included at `.git/hooks/post-commit`, but it may not work on Windows. For Windows, use the npm script or PowerShell script instead.

## Notes

- Always review your changes before pushing
- The auto-push scripts will push to the current branch
- Make sure you have the necessary permissions to push to the repository

