$files = Get-ChildItem -Recurse -Include *.js, *.jsx -Path "postJourneyMobile", "backend"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match '192\.168\.245\.72') {
        $newContent = $content -replace '192\.168\.245\.72', '192.168.115.72'
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}
Write-Host "Done!"
