# scripts/start-dev.ps1

Set-Location -Path "$PSScriptRoot\.."

Write-Host "🚀 Starting Medium Emulator..."

Start-Process "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -ArgumentList "-avd Medium_Phone_API_35 -no-snapshot"

