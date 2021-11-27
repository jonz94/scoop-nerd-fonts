import { resolve } from 'path';
import { readFile, writeFile } from 'fs/promises';

if (process.argv.length < 3) {
    process.exit();
}

const filename = resolve(process.argv[2]);
const content = await readFile(filename, 'utf8');
const jsonObject = JSON.parse(content);

let hasModified = false;

if (jsonObject.installer.script[0] === '}') {
    jsonObject.installer.script.shift();
    hasModified = true;
}

if (jsonObject.uninstaller.script[0] === '}') {
    jsonObject.uninstaller.script.shift();
    hasModified = true;
}

if (hasModified) {
    await writeFile(filename, JSON.stringify(jsonObject, null, 4) + '\n');
}
