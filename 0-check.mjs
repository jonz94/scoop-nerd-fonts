import { argv, exit } from "process";
import { resolve } from "path";
import { readFile, writeFile } from "fs/promises";

if (argv.length < 3) {
  exit(1);
}

const filename = resolve(argv.at(2));
const content = await readFile(filename, "utf8");
const jsonObject = JSON.parse(content);

const targetKeys = [
  "##",
  "version",
  "description",
  "homepage",
  "license",
  "notes",
  "depends",
  "url",
  "hash",
  "extract_dir",
  "pre_install",
  "installer",
  "pre_uninstall",
  "uninstaller",
  "post_uninstall",
  "checkver",
  "autoupdate",
];

for (const key of targetKeys) {
  if (Object.hasOwn(jsonObject, key)) {
    delete jsonObject[key];
  }
}

if (Object.keys(jsonObject).length > 0) {
  console.log(jsonObject);
}
