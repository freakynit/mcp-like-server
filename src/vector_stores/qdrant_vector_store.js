import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import * as embedder from '../embeddings.js';

let qdrantClient = null;
let collectionName = 'demo_collection';

// Default configuration
const defaultConfig = {
    url: 'http://localhost:6333',
    collectionName: 'demo_collection',
    vectorSize: 384, // `all-MiniLM-L6-v2` model dimensions size
    distance: 'Cosine'
};

async function init(functionRegs, config = {}) {
    const finalConfig = { ...defaultConfig, ...config };

    qdrantClient = new QdrantClient({
        url: finalConfig.url
    });

    collectionName = finalConfig.collectionName;

    // Check if collection exists, create if it doesn't
    try {
        const collections = await qdrantClient.getCollections();
        const collectionExists = collections.collections
            .some(col => col.name === collectionName);

        if (!collectionExists) {
            await qdrantClient.createCollection(collectionName, {
                vectors: {
                    size: finalConfig.vectorSize,
                    distance: finalConfig.distance
                }
            });
            console.log(`Created collection: ${collectionName}`);
        }
    } catch (error) {
        console.error('Error initializing Qdrant:', error);
        throw error;
    }

    await addFunctionRegs(functionRegs);
}

async function addFunctionRegs(functionRegs) {
    for (const [name, functionReg] of Object.entries(functionRegs)) {
        const definition = functionReg.definition;

        const existing = await getByName(definition.name)
        if(existing && existing.length > 0) {
            await update(existing[0].id, definition);
        } else {
            await add(definition);
        }
    }
}

async function search(query, limit = 3) {
    try {
        const queryVector = await embedder.generateEmbedding(query);

        const results = await qdrantClient.search(collectionName, {
            vector: queryVector,
            limit: limit,
            with_payload: true,
            with_vector: false
        });

        return results.map(result => ({
            id: result.id,
            name: result.payload.name,
            definition: result.payload,
            score: result.score
        }));
    } catch (error) {
        console.error('Search error:', error);
        throw error;
    }
}

async function add(definition, vector = null) {
    try {
        if (!definition.name) {
            throw new Error('Definition must have a name');
        }

        // Generate vector from name and description if not provided
        const pointVector = vector || await embedder.generateEmbedding(`${definition.name} ${definition.description}`);

        // Generate a UUID for the point ID
        const pointId = uuidv4();

        await qdrantClient.upsert(collectionName, {
            points: [{
                id: pointId,
                vector: pointVector,
                payload: definition
            }]
        });

        return pointId;
    } catch (error) {
        console.error('Add error:', error);
        throw error;
    }
}

async function update(id, definition, vector = null) {
    try {
        if (!id) {
            throw new Error('ID is required for update');
        }

        // Generate vector from name and description if not provided
        const pointVector = vector || await embedder.generateEmbedding(`${definition.name} ${definition.description}`);

        await qdrantClient.upsert(collectionName, {
            points: [{
                id: id,
                vector: pointVector,
                payload: definition
            }]
        });
    } catch (error) {
        console.error('Update error:', error);
        throw error;
    }
}

async function get(id) {
    try {
        const results = await qdrantClient.retrieve(collectionName, {
            ids: [id], // Use UUID
            with_payload: true,
            with_vector: true
        });

        if (results.length === 0) return null;

        return results.map(result => ({
            id: result.id,
            name: result.payload.name,
            definition: result.payload,
            vector: result.vector
        }));
    } catch (error) {
        console.error('Get error:', error);
        throw error;
    }
}

async function getByName(name) {
    try {
        if (!name) {
            throw new Error('Name is required');
        }

        const result = await qdrantClient.scroll(collectionName, {
            filter: {
                must: [{
                    key: "name",
                    match: {
                        value: name
                    }
                }]
            },
            with_payload: true,
            with_vector: true
        });

        return result.points.map(point => ({
            id: point.id,
            name: point.payload.name,
            definition: point.payload,
            vector: point.vector
        }));
    } catch (error) {
        console.error('GetByName error:', error);
        throw error;
    }
}

async function remove(id) {
    try {
        await qdrantClient.delete(collectionName, {
            points: [id]
        });
    } catch (error) {
        console.error('Remove error:', error);
        throw error;
    }
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
