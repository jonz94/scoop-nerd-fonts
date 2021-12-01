Param (
    [parameter(Mandatory)]
    [ValidateSet('help', 'install', 'uninstall')]
    [string]$Command,
    [string]$Directory='',
    [string]$Filter='*.ttf',
    [switch]$Recurse,
    [string]$FontName=''
)

$cwd = $(Get-Location)

Write-Host "debug: cwd is $cwd"

$note = 'This script is intended to be executed by installer/uninstaller scripts of the scoop manifest'

$usage =
@"
USAGE:
    scoop-nerd-fonts-helper -Command <SUBCOMMAND> [OPTIONS]

NOTE:
    $note

SUBCOMMANDS:
    help           Prints help information
    install        Install fonts
    uninstall      Uninstall fonts

OPTIONS:
    -Directory <directory>
        The directory for looping through each file
        [default value is `$dir]

    -Filter <pattern>
        The pattern that apply to Get-ChildItem -Filter <pattern> when looping through each file under `$Directory
        [default value is "*.ttf"]

    -FontName <name>
        This name is only used for printing out the messeage "The '`$FontName' Font family has been uninstalled and will not be present after restarting your computer." after uninstall process succeed
        [default value is `$(`$app.Replace('-NF', '').Replace('-', ' '))]

Flags:
    -Recurse
        if this flag is provided, the `-Recurse` will be applyed when looping through each file under `$Directory
"@

# print usage and exit
if ($Command -eq 'help') { $usage; exit 0; }

# is_admin function and $app, $dir, $global variables should be provided by scoop
if (!(Get-Command 'is_admin' -ErrorAction SilentlyContinue)) { throw "is_admin function not found! $note" }
if ($app -eq $null) { throw "`$app variable not found! $note" }
if ($dir -eq $null) { throw "`$dir variable not found! $note" }
if ($global -eq $null) { throw "`$global variable not found! $note" }

# setup default value
if ($Directory -eq '') { $Directory = $dir }
if ($FontName -eq '') { $FontName = $($app.Replace('-NF', '').Replace('-', ' ')) }

$currentBuildNumber = [int] (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').CurrentBuildNumber
$windows1809BuildNumber = 17763
$isPerUserFontInstallationSupported = $currentBuildNumber -ge $windows1809BuildNumber
$isGlobalInstallation = $global -or !$isPerUserFontInstallationSupported

if ($isGlobalInstallation -and !(is_admin)) {
    throw "Administrator rights are required to install $app."
}

$systemFontDir = "$env:windir\Fonts"
$userFontDir = "$env:LOCALAPPDATA\Microsoft\Windows\Fonts"
$fontInstallDir = if ($isGlobalInstallation) { $systemFontDir } else { $userFontDir }

# create $fontInstallDir if not exists, especially for the $userFontDir directory
New-Item $fontInstallDir -ItemType Directory -ErrorAction SilentlyContinue | Out-Null

$registryRoot = if ($isGlobalInstallation) { 'HKLM' } else { 'HKCU' }
$registryPath = "${registryRoot}:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"

$fontFileTypeDictonary = @{
    '.fnt' = ''
    '.fon' = ''
    '.otf' = ' (OpenType)'
    '.ttc' = ' (TrueType)'
    '.ttf' = ' (TrueType)'
}

# loop through each file under $Directory
Get-ChildItem $Directory -Filter $Filter -Recurse:$Recurse | ForEach-Object {
    # get font file type by the file extension
    $fontFileType = $fontFileTypeDictonary.Item($_.Extension)

    # skip non-font files
    if ($fontFileType -eq $null) { return }

    $registryName = $_.Name.Replace($_.Extension, $fontFileType)

    if ($Command -eq 'install') {
        $registryValue = if ($isGlobalInstallation) { $_.Name } else { "$fontInstallDir\$($_.Name)" }

        New-ItemProperty -Path $registryPath -Name $registryName -Value $registryValue -Force | Out-Null
        Copy-Item $_.FullName -Destination $fontInstallDir
    }

    if ($Command -eq 'uninstall') {
        Remove-ItemProperty -Path $registryPath -Name $registryName -Force -ErrorAction SilentlyContinue
        Remove-Item "$fontInstallDir\$($_.Name)" -Force -ErrorAction SilentlyContinue
    }
}

if ($Command -eq 'uninstall') {
    Write-Host "The '$FontName' Font family has been uninstalled and will not be present after restarting your computer." -Foreground Magenta
}
