# Database Schema Push Script
# This script helps push the database schema to Neon

Write-Host "Database Schema Push Script" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Check if VITE_DATABASE_URL is set
$dbUrl = $env:VITE_DATABASE_URL

if (-not $dbUrl) {
    Write-Host "⚠️  VITE_DATABASE_URL not found in environment" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please set it using one of these methods:" -ForegroundColor Yellow
    Write-Host "1. Create .env.local file with: VITE_DATABASE_URL=your_connection_string" -ForegroundColor White
    Write-Host "2. Set it in this PowerShell session:" -ForegroundColor White
    Write-Host "   `$env:VITE_DATABASE_URL='your_connection_string'" -ForegroundColor Gray
    Write-Host "3. Get it from Netlify dashboard > Environment variables" -ForegroundColor White
    Write-Host ""
    
    $manualUrl = Read-Host "Or enter your Neon database URL now (or press Enter to exit)"
    if ($manualUrl) {
        $env:VITE_DATABASE_URL = $manualUrl
        Write-Host "✅ Database URL set for this session" -ForegroundColor Green
    } else {
        Write-Host "❌ Exiting. Please set VITE_DATABASE_URL and try again." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Found VITE_DATABASE_URL (length: $($dbUrl.Length))" -ForegroundColor Green
}

Write-Host ""
Write-Host "Pushing schema to database..." -ForegroundColor Cyan
Write-Host ""

# Run drizzle-kit push
npm run db:push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Schema push completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Verify the changes in your Neon dashboard" -ForegroundColor White
    Write-Host "2. Test enrolling a homeowner in the app" -ForegroundColor White
    Write-Host "3. Redeploy to Netlify if needed" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Schema push failed. Check the error above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "- Invalid database connection string" -ForegroundColor White
    Write-Host "- Database permissions issue" -ForegroundColor White
    Write-Host "- Network connectivity problem" -ForegroundColor White
}
