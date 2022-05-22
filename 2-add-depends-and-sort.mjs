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

const sortedJsonObject = {
    "##": jsonObject["##"],
    version: jsonObject.version,
    description: jsonObject.description,
    homepage: jsonObject.homepage,
    license: jsonObject.license,
    depends: "scoop-nerd-fonts-helper",
    url: jsonObject.url,
    hash: jsonObject.hash,
    extract_dir: jsonObject.extract_dir,
    installer: jsonObject.installer,
    uninstaller: jsonObject.uninstaller,
    checkver: jsonObject.checkver,
    autoupdate: jsonObject.autoupdate,
};

for (const key in sortedJsonObject) {
    if (Object.hasOwnProperty.call(sortedJsonObject, key)) {
        const value = sortedJsonObject[key];
        if (value === undefined) {
            delete sortedJsonObject[key];
        }
    }
}

await writeFile(filename, JSON.stringify(sortedJsonObject, null, 4) + "\n");
