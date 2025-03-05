import { readdir } from 'fs/promises';
import { resolve, extname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const functionRegs = {};

const functionsDir = resolve('./src/functions'); // Adjust path if necessary
const files = await readdir(functionsDir);

for (const file of files) {
    if (![".js", ".ts"].includes(extname(file))) continue;

    const filePath = pathToFileURL(resolve(functionsDir, file)).href;
    const module = await import(filePath);

    if (module.default.definition && module.default.definition.name && module.default.handler) {
        functionRegs[module.default.definition.name] = {
            name: module.default.definition.name,
            definition: module.default.definition,
            handler: module.default.handler
        };
    } else {
        throw new Error(`Function definition or definition.name or handler not provided for ${file}`);
    }
}

export {
    functionRegs
}