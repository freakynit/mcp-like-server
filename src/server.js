import express from 'express';
import 'dotenv/config';

import {functionRegs} from './loader.js';
// import * as vectorStore from './vector_stores/in_memory_vector_store.js';
import * as vectorStore from './vector_stores/qdrant_vector_store.js';
import * as embedder from './embeddings.js';
import * as runners from './runners/simple_runner.js';

const SERVER_PORT = process.env.SERVER_PORT;
const SERVER_AUTH_KEY = process.env.SERVER_AUTH_KEY;

(async () => {
    await embedder.init();
    await vectorStore.init(functionRegs, null);
    await runners.init(null);
})();

const app = express();
app.use(express.json());

// Admin auth middleware
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || authHeader !== `Bearer ${SERVER_AUTH_KEY}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Utilities
const buildResponse = (success, resultOrError) => {
    return {
        success,
        result: success ? resultOrError : null,
        error_message: success ? null : resultOrError,
        content_type: 'application/json'
    };
}

// Search endpoint
app.get('/api/functions/search', authMiddleware, async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    const results = await vectorStore.search(query);
    res.json(buildResponse(true, results));
});

// Function execution endpoint
app.post('/api/functions/execute', authMiddleware, async (req, res) => {
    const { name, arguments: args } = req.body;

    if (!name || args === undefined) {
        return res.status(400).json(buildResponse(false, 'Missing name or arguments'));
    }

    if (!(name in functionRegs)) {
        return res.status(404).json(buildResponse(false, 'Function not found'));
    }

    try {
        const result = await runners.run(functionRegs[name].handler, args);

        res.json(buildResponse(true, result));
    } catch (error) {
        res.status(500).json(buildResponse(false, error.message));
    }
});

app.listen(SERVER_PORT, () => {
    console.log(`Server running at http://localhost:${SERVER_PORT}`);
});
