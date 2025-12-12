# Auto-push script for GitHub
# Usage: .\scripts\auto-push.ps1 [commit-message]
# Example: .\scripts\auto-push.ps1 "Fixed bug in dashboard"

param(
    [Parameter(Position=0)]
    [string]$CommitMessage = "Auto-commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

# Get current branch
$branch = git rev-parse --abbrev-ref HEAD

# Stage all changes
git add .

# Commit with message
git commit -m $CommitMessage

# Push to GitHub
git push origin $branch

Write-Host "✅ Changes pushed to GitHub successfully!" -ForegroundColor Green

