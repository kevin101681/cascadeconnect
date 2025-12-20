# Script to add Cloudinary variables to .env.local
$envFile = ".env.local"

Write-Host "`n📝 Adding Cloudinary variables to .env.local`n" -ForegroundColor Cyan

# Check if file exists
if (-not (Test-Path $envFile)) {
    Write-Host "Creating .env.local file..." -ForegroundColor Yellow
    New-Item -Path $envFile -ItemType File -Force | Out-Null
}

# Read current content
$content = Get-Content $envFile -Raw

# Check if Cloudinary vars already exist
if ($content -match "CLOUDINARY") {
    Write-Host "⚠️  Cloudinary variables already exist in .env.local" -ForegroundColor Yellow
    Write-Host "`nCurrent Cloudinary variables:" -ForegroundColor Cyan
    Get-Content $envFile | Where-Object { $_ -match "CLOUDINARY" } | ForEach-Object {
        $line = $_.Trim()
        if ($line -and !$line.StartsWith("#")) {
            $key = ($line -split "=")[0].Trim()
            Write-Host "  - $key" -ForegroundColor Green
        }
    }
    Write-Host "`n💡 If values are empty or placeholders, update them with your actual credentials" -ForegroundColor Yellow
} else {
    Write-Host "Adding Cloudinary variables to .env.local...`n" -ForegroundColor Green
    
    # Add Cloudinary section if content exists and doesn't end with newline
    if ($content -and !$content.EndsWith("`n") -and !$content.EndsWith("`r`n")) {
        Add-Content -Path $envFile -Value "`n"
    }
    
    # Add Cloudinary variables
    Add-Content -Path $envFile -Value "# Cloudinary Configuration"
    Add-Content -Path $envFile -Value "# Get credentials from: https://cloudinary.com/console"
    Add-Content -Path $envFile -Value "VITE_CLOUDINARY_CLOUD_NAME="
    Add-Content -Path $envFile -Value "VITE_CLOUDINARY_API_KEY="
    Add-Content -Path $envFile -Value "VITE_CLOUDINARY_API_SECRET="
    
    Write-Host "✅ Added Cloudinary variable placeholders to .env.local" -ForegroundColor Green
    Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Open .env.local in a text editor" -ForegroundColor White
    Write-Host "   2. Replace the empty values with your actual Cloudinary credentials:" -ForegroundColor White
    Write-Host "      VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name" -ForegroundColor Yellow
    Write-Host "      VITE_CLOUDINARY_API_KEY=your_api_key" -ForegroundColor Yellow
    Write-Host "      VITE_CLOUDINARY_API_SECRET=your_api_secret" -ForegroundColor Yellow
    Write-Host "   3. Save the file" -ForegroundColor White
    Write-Host "   4. Restart the server (npm run dev)" -ForegroundColor White
    Write-Host "`n💡 Get your credentials from: https://cloudinary.com/console" -ForegroundColor Cyan
}

Write-Host "`n"














