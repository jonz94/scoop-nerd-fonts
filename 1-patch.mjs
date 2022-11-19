import { argv, exit } from "process";
import { resolve } from "path";
import { readFile, writeFile } from "fs/promises";

if (argv.length < 3) {
    exit(1);
}

const filename = resolve(argv.at(2));
const content = await readFile(filename, "utf8");
const jsonObject = JSON.parse(content);

const originInstallerScript = jsonObject.installer.script;
const loopThroughFilesFirstStep = originInstallerScript.at(20);

/** @type {string} */
const getChildItemArguments = loopThroughFilesFirstStep
    .substring("Get-ChildItem ".length)
    .substring(
        0,
        loopThroughFilesFirstStep.substring("Get-ChildItem ".length).length -
            " | ForEach-Object {".length
    );

const fontType = originInstallerScript.at(22).includes("OpenType")
    ? "OpenType"
    : "TrueType";

const patchedInstallerScript = [
    '$currentBuildNumber = [int] (Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion").CurrentBuildNumber',
    "$windows11Version22H2BuildNumber = 22621",
    "$doesPerUserFontInstallationHaveIssue = $currentBuildNumber -ge $windows11Version22H2BuildNumber",
    "if ($doesPerUserFontInstallationHaveIssue -and !$global) {",
    "    scoop uninstall $app",
    '    Write-Host ""',
    '    Write-Host "Currently, on Windows 11 Version 22H2 (OS Build 22621) or later," -Foreground DarkRed',
    '    Write-Host "Font installation only works when installing font for all users." -Foreground DarkRed',
    '    Write-Host ""',
    "    Write-Host \"Please use following commands to install '$app' Font for all users.\" -Foreground DarkRed",
    '    Write-Host ""',
    '    Write-Host "        scoop install sudo"',
    '    Write-Host "        sudo scoop install -g $app"',
    '    Write-Host ""',
    '    Write-Host "See https://github.com/matthewjberger/scoop-nerd-fonts/issues/198 for more details." -Foreground Magenta',
    "    exit 1",
    "}",
    "$windows10Version1809BuildNumber = 17763",
    "$isPerUserFontInstallationSupported = $currentBuildNumber -ge $windows10Version1809BuildNumber",
    "if (!$isPerUserFontInstallationSupported -and !$global) {",
    "    scoop uninstall $app",
    '    Write-Host ""',
    '    Write-Host "For Windows version before Windows 10 Version 1809 (OS Build 17763)," -Foreground DarkRed',
    '    Write-Host "Font can only be installed for all users." -Foreground DarkRed',
    '    Write-Host ""',
    "    Write-Host \"Please use following commands to install '$app' Font for all users.\" -Foreground DarkRed",
    '    Write-Host ""',
    '    Write-Host "        scoop install sudo"',
    '    Write-Host "        sudo scoop install -g $app"',
    '    Write-Host ""',
    "    exit 1",
    "}",
    '$fontInstallDir = if ($global) { "$env:windir\\Fonts" } else { "$env:LOCALAPPDATA\\Microsoft\\Windows\\Fonts" }',
    '$registryRoot = if ($global) { "HKLM" } else { "HKCU" }',
    '$registryKey = "${registryRoot}:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts"',
    "New-Item $fontInstallDir -ItemType Directory -ErrorAction SilentlyContinue | Out-Null",
    `Get-ChildItem ${getChildItemArguments} | ForEach-Object {`,
    '    $value = if ($isFontInstallationForAllUsers) { $_.Name } else { "$fontInstallDir\\$($_.Name)" }',
    `    New-ItemProperty -Path $registryKey -Name $_.Name.Replace($_.Extension, ' (${fontType})') -Value $value -Force | Out-Null`,
    "    Copy-Item $_.FullName -Destination $fontInstallDir",
    "}",
];

jsonObject.installer.script = patchedInstallerScript;

await writeFile(filename, JSON.stringify(jsonObject, null, 4) + "\n");
