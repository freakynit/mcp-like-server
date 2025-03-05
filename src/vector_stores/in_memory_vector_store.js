import {v4 as uuidv4} from "uuid";
import * as embedder from '../embeddings.js';

let vectorStore = null;

async function init(functionRegs, config) {
    vectorStore = {};
    await addFunctionRegs(functionRegs);
}

async function addFunctionRegs(functionRegs) {
    for (const [name, functionReg] of Object.entries(functionRegs)) {
        const definition = functionReg.definition;

        const existing = await getByName(definition.name)
        if(existing) {
            await add(definition);
        } else {
            await update(existing.id, definition);
        }
    }
}

function search(query) {
    const results = [];
    const lowerCaseQuery = query.toLowerCase();

    for (const [pointId, storeDoc] of Object.entries(vectorStore)) {
        const name = storeDoc.payload.name;
        const definition = storeDoc.payload;
        if (name.toLowerCase().includes(lowerCaseQuery) ||
            definition.description.toLowerCase().includes(lowerCaseQuery)) {
            results.push({ id: pointId, name, definition });
        }
    }
    return results;
}

async function add(definition, vector = null) {
    if (!definition.name) {
        throw new Error('Definition must have a name');
    }

    const pointVector = vector || await embedder.generateEmbedding(`${definition.name} ${definition.description}`);
    const pointId = uuidv4();

    vectorStore[pointId] = {
        id: pointId,
        vector: pointVector,
        payload: definition
    };

    return pointId;
}

async function update(id, definition, vector = null) {
    if (!id) {
        throw new Error('ID is required for update');
    }

    const pointVector = vector || await embedder.generateEmbedding(`${definition.name} ${definition.description}`);

    vectorStore[id] = {
        id: id,
        vector: pointVector,
        payload: definition
    };
}

function get(id) {
    return [vectorStore[id]];
}

async function getByName(name) {
    if (!name) {
        throw new Error('Name is required');
    }

    for (const [pointId, storeDoc] of Object.entries(vectorStore)) {
        if (storeDoc.payload.name === name) {
            return [{
                id: pointId,
                name: storeDoc.payload.name,
                definition: storeDoc.payload,
                vector: storeDoc.vector
            }];
        }
    }
    return null;
}

function remove(id) {
    delete vectorStore[id];
}

export {
    init,
    search,
    add,
    update,
    get,
    remove,
    getByName
};
