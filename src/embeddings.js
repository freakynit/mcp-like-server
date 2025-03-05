import { Pipeline, pipeline } from '@xenova/transformers';

let embedder = null;

async function init() {
    try {
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('Embedding model loaded');
    } catch (error) {
        console.error('Error loading embedding model:', error);
        throw error;
    }
}

async function generateEmbedding(text) {
    try {
        const output = await embedder(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

export {
    init,
    generateEmbedding
};
