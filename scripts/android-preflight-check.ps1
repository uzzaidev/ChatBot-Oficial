$ErrorActionPreference = "Stop"

Write-Host "== Android preflight check =="

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$checks = @(
  @{ Name = "build.gradle"; Path = "android/app/build.gradle" },
  @{ Name = "AndroidManifest"; Path = "android/app/src/main/AndroidManifest.xml" },
  @{ Name = "release.properties"; Path = "android/release.properties" },
  @{ Name = "keystore"; Path = "android/app/release.keystore" },
  @{ Name = "google-services.json"; Path = "android/app/google-services.json" }
)

foreach ($c in $checks) {
  $ok = Test-Path $c.Path
  if ($ok) {
    Write-Host ("[OK]   {0}: {1}" -f $c.Name, $c.Path)
  } else {
    Write-Host ("[FAIL] {0}: {1}" -f $c.Name, $c.Path)
  }
}

Write-Host ""
Write-Host "Version info:"
if (Get-Command rg -ErrorAction SilentlyContinue) {
  rg -n "versionCode|versionName" "android/app/build.gradle"
  rg -n "android.permission.CAMERA|POST_NOTIFICATIONS|USE_BIOMETRIC" "android/app/src/main/AndroidManifest.xml"
} else {
  Get-Content "android/app/build.gradle" | Select-String -Pattern "versionCode|versionName"
  Get-Content "android/app/src/main/AndroidManifest.xml" | Select-String -Pattern "CAMERA|POST_NOTIFICATIONS|USE_BIOMETRIC"
}

Write-Host ""
Write-Host "Next step: .\\scripts\\build-android-release.ps1"

