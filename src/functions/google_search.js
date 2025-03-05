import {
    search,
    OrganicResult, // Import the result types you need
    DictionaryResult,
    ResultTypes, // Import to filter results by type
} from "google-sr";

export default {
    definition: {
        "name": "googleSearch",
        "description": "Performs a Google search and returns relevant results",
        "parameters": {
            "type": "object",
            "properties": {
                "query": { "type": "string", "description": "The search query to look up on Google" }
            },
            "required": ["query"]
        }
    },
    handler: async ({ query }) => {
        const queryResult = await search({
            query,
            resultTypes: [OrganicResult, DictionaryResult]
        });

        return queryResult;
    }
};