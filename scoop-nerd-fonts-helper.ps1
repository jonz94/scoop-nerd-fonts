$usage =
@'
usage: scoop-nerd-fonts-helper (command) (global) (app) (dir) (filter) (recurse) (type)

e.g. scoop-nerd-fonts-helper install $global $app $dir "'*.ttf'" $true TrueType
e.g. scoop-nerd-fonts-helper uninstall $global $app $dir "'*.otf'" $false OpenType
'@

$command = $args[0]
$global = $args[1]
$app = $args[2]
$dir = $args[3]
$filter = $args[4]
$recurse = $args[5]
$type = $args[6]

function is_admin {
    $admin = [security.principal.windowsbuiltinrole]::administrator
    $id = [security.principal.windowsidentity]::getcurrent()
    ([security.principal.windowsprincipal]($id)).isinrole($admin)
}

$currentBuildNumber = [int] (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").CurrentBuildNumber
$windows1809BuildNumber = 17763
$isPerUserFontInstallationSupported = $currentBuildNumber -ge $windows1809BuildNumber
$isFontInstallationForAllUsers = $global -or !$isPerUserFontInstallationSupported

if ($isFontInstallationForAllUsers -and !(is_admin)) {
    throw "Administrator rights are required to install $app."
}

$fontInstallDir = if ($isFontInstallationForAllUsers) { "$env:windir\Fonts" } else { "$env:LOCALAPPDATA\Microsoft\Windows\Fonts" }
$registryRoot = if ($isFontInstallationForAllUsers) { "HKLM" } else { "HKCU" }
$registryKey = "${registryRoot}:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"

New-Item $fontInstallDir -ItemType Directory -ErrorAction SilentlyContinue | Out-Null

Get-ChildItem $dir -Filter $filter -Recurse:$recurse | ForEach-Object {
    $name = $_.Name.Replace($_.Extension, " ($type)")
    if ($command -eq "install") {
        $value = if ($isFontInstallationForAllUsers) { $_.Name } else { "$fontInstallDir\$($_.Name)" }
        New-ItemProperty -Path $registryKey -Name $name -Value $value -Force | Out-Null
        Copy-Item $_.FullName -Destination $fontInstallDir
    } else {
        Remove-ItemProperty -Path $registryKey -Name $name -Force -ErrorAction SilentlyContinue
        Remove-Item "$fontInstallDir\$($_.Name)" -Force -ErrorAction SilentlyContinue
    }
}
