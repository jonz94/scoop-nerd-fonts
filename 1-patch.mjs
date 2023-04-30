import { argv, exit } from "node:process";
import { resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

if (argv.length < 3) {
  exit(1);
}

const filename = resolve(argv.at(2));
const content = await readFile(filename, "utf8");
const jsonObject = JSON.parse(content);

/** @type {string[]} */
const originInstallerScript = jsonObject.installer.script;
const loopThroughFilesFirstStepIndex = originInstallerScript.findIndex((line) =>
  /Get-ChildItem.* | ForEach-Object \{/.test(line)
);
const loopThroughFilesFirstStep = originInstallerScript.at(
  loopThroughFilesFirstStepIndex
);

/** @type {string} */
const getChildItemArguments = loopThroughFilesFirstStep
  .substring("Get-ChildItem ".length)
  .substring(
    0,
    loopThroughFilesFirstStep.substring("Get-ChildItem ".length).length -
      " | ForEach-Object {".length
  );

jsonObject.pre_uninstall = [
  '$fontInstallDir = if ($global) { "$env:windir\\Fonts" } else { "$env:LOCALAPPDATA\\Microsoft\\Windows\\Fonts" }',
  `Get-ChildItem ${getChildItemArguments} | ForEach-Object {`,
  "    Get-ChildItem $fontInstallDir -Filter $_.Name | ForEach-Object {",
  "        try {",
  "            Rename-Item $_.FullName $_.FullName -ErrorVariable LockError -ErrorAction Stop",
  "        } catch {",
  '            Write-Host ""',
  '            Write-Host " Error " -Background DarkRed -Foreground White -NoNewline',
  '            Write-Host ""',
  "            Write-Host \" Cannot uninstall '$app' font.\" -Foreground DarkRed",
  '            Write-Host ""',
  '            Write-Host " Reason " -Background DarkCyan -Foreground White -NoNewline',
  '            Write-Host ""',
  "            Write-Host \" The '$app' font is currently being used by another application,\" -Foreground DarkCyan",
  '            Write-Host " so it cannot be deleted." -Foreground DarkCyan',
  '            Write-Host ""',
  '            Write-Host " Suggestion " -Background Magenta -Foreground White -NoNewline',
  '            Write-Host ""',
  "            Write-Host \" Close all applications that are using '$app' font (e.g. vscode),\" -Foreground Magenta",
  '            Write-Host " and then try again." -Foreground Magenta',
  '            Write-Host ""',
  "            exit 1",
  "        }",
  "    }",
  "}",
];

await writeFile(filename, JSON.stringify(jsonObject, null, 4) + "\n");
