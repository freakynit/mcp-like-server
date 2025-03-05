import 'dotenv/config';

import {functionRegs} from './loader.js';

import * as vectorStore from './vector_stores/qdrant_vector_store.js';
import * as embedder from "./embeddings.js";
import * as runners from "./runners/simple_runner.js";

async function init() {
    await embedder.init();
    await vectorStore.init(null);
    await runners.init(null);
}

async function run2() {
    console.log(`functionRegs`, functionRegs);
}

async function run1() {
    // Add a new function with automatic embedding
    await vectorStore.add({
        name: 'multiplyNumbers',
        description: 'Multiplies two numbers',
        parameters: {
            type: 'object',
            properties: {
                a: { type: 'number' },
                b: { type: 'number' }
            }
        }
    });

    // Search for similar functions
    const results = await vectorStore.search('numeric operations');
    console.log(`\n=== Search Results ===\n`, results);

    // Get specific item
    const items = await vectorStore.getByName('multiplyNumbers');
    console.log(`\n=== GetByName ===\n`, items);

    // Clean up
    await vectorStore.remove(items[0].id);
}

(async () => {
    //await init();
    await run2();
})();

