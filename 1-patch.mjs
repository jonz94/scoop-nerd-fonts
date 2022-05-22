import { argv, exit } from "process";
import { resolve } from "path";
import { readFile, writeFile } from "fs/promises";

if (argv.length < 3) {
    exit(1);
}

const filename = resolve(argv.at(2));

if (filename.endsWith("scoop-nerd-fonts-helper.json")) {
    exit();
}

const content = await readFile(filename, "utf8");
const jsonObject = JSON.parse(content);

const originInstallerScript = jsonObject.installer.script;
let customInstallerSteps = [];
let indexOfMainInstallerFirstStep = 0;

if (originInstallerScript.length !== 17) {
    indexOfMainInstallerFirstStep = jsonObject.installer.script.findIndex(
        (element) => element.includes("Get-ItemProperty")
    );
    customInstallerSteps = originInstallerScript.slice(
        0,
        indexOfMainInstallerFirstStep
    );
}

const loopThroughFilesFirstStep = originInstallerScript.at(
    indexOfMainInstallerFirstStep + 12
);

/** @type {string} */
let getChildItemArguments = loopThroughFilesFirstStep
    .substring("Get-ChildItem ".length)
    .substring(
        0,
        loopThroughFilesFirstStep.substring("Get-ChildItem ".length).length -
            " | ForEach-Object {".length
    );

const hasRecurseFlag = getChildItemArguments.includes("-Recurse");

if (hasRecurseFlag) {
    getChildItemArguments = getChildItemArguments.slice(
        0,
        " -Recurse".length * -1
    );
}

const dir = getChildItemArguments.split(" -Filter ").at(0);
const filter = getChildItemArguments.split(" -Filter ").at(1);

const isDirectoryOptionNeeded = dir !== "$dir";
const isFilterOptionNeeded = filter !== "'*.ttf'";

const patchedInstallerScript = [
    ...customInstallerSteps,
    "try {",
    `    scoop-nerd-fonts-helper -Command install${
        isDirectoryOptionNeeded ? " -Directory " + dir : ""
    }${isFilterOptionNeeded ? " -Filter " + filter : ""}${
        hasRecurseFlag ? " -Recurse" : ""
    }`,
    "} catch {",
    "    abort($_, 1)",
    "}",
];

jsonObject.installer.script = patchedInstallerScript;

const originUninstallerScript = jsonObject.uninstaller.script;
const originUninstallMessage = originUninstallerScript.at(-1);

const messagesSplitBySingleQuote = originUninstallMessage.split("'");
let fontName = null;

if (messagesSplitBySingleQuote.length === 7) {
} else if (messagesSplitBySingleQuote.length === 3) {
    fontName = messagesSplitBySingleQuote.at(1);

    const filenameWithoutExtension = filename
        .split("\\")
        .at(-1)
        .split(".")
        .at(0);

    if (fontName === "$app") {
        fontName = null;
    } else if (fontName === filenameWithoutExtension) {
        fontName = null;
    } else if (fontName === filenameWithoutExtension.replaceAll("-", " ")) {
        fontName = null;
    }
} else if (filename.endsWith("Anuphan.json")) {
    fontName = null;
} else if (filename.endsWith("Noto-CJK-Mega-OTC.json")) {
    fontName = "Noto CJK Mega OTC (OpenType Collection)";
} else if (filename.endsWith("Source-Han-Mega-OTC.json")) {
    fontName = "Source Han Mega OTC (OpenType Collection)";
} else if (filename.endsWith("Source-Han-Noto-CJK-Ultra-OTC.json")) {
    fontName = "Source Han & Noto CJK Ultra OTC (OpenType Collection)";
} else {
    console.error("undefined edge case");
    console.log(filename);
    console.log(fontName.length);
    console.log(fontName);

    exit(1);
}

const patchedUninstallerScript = [
    "try {",
    `    scoop-nerd-fonts-helper -Command uninstall${
        isDirectoryOptionNeeded ? " -Directory " + dir : ""
    }${isFilterOptionNeeded ? " -Filter " + filter : ""}${
        hasRecurseFlag ? " -Recurse" : ""
    }${fontName ? " -FontName '" + fontName + "'" : ""}`,
    "} catch {",
    "    abort($_, 1)",
    "}",
];

jsonObject.uninstaller.script = patchedUninstallerScript;

await writeFile(filename, JSON.stringify(jsonObject, null, 4) + "\n");
