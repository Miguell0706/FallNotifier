# scripts/start-dev.ps1

Set-Location -Path "$PSScriptRoot\.."

Write-Host "🚀 Starting Small Emulator..."

Start-Process "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -ArgumentList "-avd Small_Phone_API_35 -no-snapshot"

