import { resolve } from "path";
import { readFile, writeFile } from "fs/promises";

if (process.argv.length < 3) {
    process.exit();
}

const filename = resolve(process.argv[2]);
const content = await readFile(filename, "utf8");
const jsonObject = JSON.parse(content);

const originInstallerScript = jsonObject.installer.script;
let customInstallerSteps = [];
let indexOfMainInstallerFirstStep = 0;
let indexOfEditRegistryStep = 1;

if (originInstallerScript.length !== 4) {
    indexOfEditRegistryStep = jsonObject.installer.script.findIndex((element) =>
        element.includes("New-ItemProperty")
    );
    indexOfMainInstallerFirstStep = indexOfEditRegistryStep - 1;
    customInstallerSteps = originInstallerScript.slice(
        0,
        indexOfMainInstallerFirstStep
    );
}

const mainInstallerFirstStep =
    originInstallerScript[indexOfMainInstallerFirstStep];

const getChildItemArguments = mainInstallerFirstStep
    .substring("Get-ChildItem ".length)
    .substring(
        0,
        mainInstallerFirstStep.substring("Get-ChildItem ".length).length -
            " | ForEach-Object {".length
    );

const fontType = originInstallerScript[indexOfEditRegistryStep].includes(
    "OpenType"
)
    ? "OpenType"
    : "TrueType";

const patchedInstallerScript = [
    ...customInstallerSteps,
    '$currentBuildNumber = [int] (Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion").CurrentBuildNumber',
    "$windows1809BuildNumber = 17763",
    "$isPerUserFontInstallationSupported = $currentBuildNumber -ge $windows1809BuildNumber",
    "$isFontInstallationForAllUsers = $global -or !$isPerUserFontInstallationSupported",
    "if ($isFontInstallationForAllUsers -and !(is_admin)) {",
    '    error "Administrator rights are required to install $app."',
    "    exit 1",
    "}",
    '$fontInstallDir = if ($isFontInstallationForAllUsers) { "$env:windir\\Fonts" } else { "$env:LOCALAPPDATA\\Microsoft\\Windows\\Fonts" }',
    '$registryRoot = if ($isFontInstallationForAllUsers) { "HKLM" } else { "HKCU" }',
    '$registryKey = "${registryRoot}:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts"',
    "New-Item $fontInstallDir -ItemType Directory -ErrorAction SilentlyContinue | Out-Null",
    `Get-ChildItem ${getChildItemArguments} | ForEach-Object {`,
    '    $value = if ($isFontInstallationForAllUsers) { $_.Name } else { "$fontInstallDir\\$($_.Name)" }',
    `    New-ItemProperty -Path $registryKey -Name $_.Name.Replace($_.Extension, ' (${fontType})') -Value $value -Force | Out-Null`,
    "    Copy-Item $_.FullName -Destination $fontInstallDir",
    "}",
];

jsonObject.installer.script = patchedInstallerScript;

const originUninstallerScript = jsonObject.uninstaller.script;
const originUninstallMessage = originUninstallerScript[4];
const patchedUninstallerScript = [
    '$currentBuildNumber = [int] (Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion").CurrentBuildNumber',
    "$windows1809BuildNumber = 17763",
    "$isPerUserFontInstallationSupported = $currentBuildNumber -ge $windows1809BuildNumber",
    "$isFontInstallationForAllUsers = $global -or !$isPerUserFontInstallationSupported",
    "if ($isFontInstallationForAllUsers -and !(is_admin)) {",
    '    error "Administrator rights are required to uninstall $app."',
    "    exit 1",
    "}",
    '$fontInstallDir = if ($isFontInstallationForAllUsers) { "$env:windir\\Fonts" } else { "$env:LOCALAPPDATA\\Microsoft\\Windows\\Fonts" }',
    '$registryRoot = if ($isFontInstallationForAllUsers) { "HKLM" } else { "HKCU" }',
    '$registryKey = "${registryRoot}:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts"',
    `Get-ChildItem ${getChildItemArguments} | ForEach-Object {`,
    `    Remove-ItemProperty -Path $registryKey -Name $_.Name.Replace($_.Extension, ' (${fontType})') -Force -ErrorAction SilentlyContinue`,
    '    Remove-Item "$fontInstallDir\\$($_.Name)" -Force -ErrorAction SilentlyContinue',
    "}",
    originUninstallMessage,
];

jsonObject.uninstaller.script = patchedUninstallerScript;

await writeFile(filename, JSON.stringify(jsonObject, null, 4) + "\n");
