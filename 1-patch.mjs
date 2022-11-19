import { argv, exit } from "process";
import { resolve } from "path";
import { readFile, writeFile } from "fs/promises";

if (argv.length < 3) {
    exit(1);
}

const filename = resolve(argv.at(2));
const content = await readFile(filename, "utf8");
const jsonObject = JSON.parse(content);

const originUninstallerScript = jsonObject.uninstaller.script;

const originUninstallerScriptWithoutLastLine = originUninstallerScript.slice(
    0,
    originUninstallerScript.length - 1
);
const lastLineOfOriginUninstallerScript = originUninstallerScript.at(-1);

const patchedInstallerScript = [
    ...originUninstallerScriptWithoutLastLine,
    'if ($cmd -eq "uninstall") {',
    `    ${lastLineOfOriginUninstallerScript}`,
    "}",
];

jsonObject.uninstaller.script = patchedInstallerScript;

await writeFile(filename, JSON.stringify(jsonObject, null, 4) + "\n");
