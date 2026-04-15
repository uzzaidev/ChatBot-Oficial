param(
  [switch]$SkipClean
)

$ErrorActionPreference = "Stop"

Write-Host "== Android release build (Windows) =="

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$jbrJava = "C:\Program Files\Android\Android Studio\jbr\bin\java.exe"
$jbrHome = "C:\Program Files\Android\Android Studio\jbr"

if (Test-Path $jbrJava) {
  $env:JAVA_HOME = $jbrHome
  $env:Path = "$env:JAVA_HOME\bin;$env:Path"
  Write-Host "Using JAVA_HOME: $env:JAVA_HOME"
} elseif (-not $env:JAVA_HOME) {
  throw "JAVA_HOME not set and Android Studio JBR not found. Install Android Studio or set JAVA_HOME to JDK 21."
}

Write-Host "Java version:"
& java -version

Write-Host ""
Write-Host "Syncing Capacitor Android plugins..."
& npx cap sync android

Write-Host ""
Write-Host "Building AAB..."
Set-Location (Join-Path $repoRoot "android")
if ($SkipClean) {
  & .\gradlew.bat bundleRelease
} else {
  & .\gradlew.bat clean bundleRelease
}

$aabPath = Join-Path $repoRoot "android\app\build\outputs\bundle\release\app-release.aab"
if (-not (Test-Path $aabPath)) {
  throw "AAB not found at $aabPath"
}

$aab = Get-Item $aabPath
$hash = Get-FileHash $aabPath -Algorithm SHA256

Write-Host ""
Write-Host "Build completed successfully."
Write-Host "AAB: $($aab.FullName)"
Write-Host ("Size: {0:N2} MB" -f ($aab.Length / 1MB))
Write-Host "SHA256: $($hash.Hash)"

