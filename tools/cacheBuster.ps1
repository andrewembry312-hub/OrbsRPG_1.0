# Cache Buster Script
$indexPath = ".\index.html"

if (-not (Test-Path $indexPath)) {
    Write-Host "ERROR: index.html not found" -ForegroundColor Red
    exit 1
}

$content = Get-Content $indexPath -Raw

if ($content -match '(\d{8}[a-z])') {
    $currentVersion = $matches[1]
    Write-Host "Current version: $currentVersion" -ForegroundColor Cyan
    
    $dateStr = $currentVersion.Substring(0, 8)
    $letterChar = $currentVersion.Substring(8, 1)
    
    if ($letterChar -eq 'z') {
        $newLetter = 'a'
        $date = [DateTime]::ParseExact($dateStr, "yyyyMMdd", $null)
        $date = $date.AddDays(1)
        $dateStr = $date.ToString("yyyyMMdd")
    } else {
        $newLetter = [char]([byte][char]$letterChar + 1)
    }
    
    $newVersion = $dateStr + $newLetter
    Write-Host "New version: $newVersion" -ForegroundColor Green
    
    $updatedContent = $content -replace $currentVersion, $newVersion
    Set-Content $indexPath -Value $updatedContent -NoNewline
    
    Write-Host "Cache buster updated successfully!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Could not find version number in index.html" -ForegroundColor Red
    exit 1
}