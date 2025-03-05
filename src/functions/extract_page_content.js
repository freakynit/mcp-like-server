import FirecrawlApp from '@mendable/firecrawl-js';
const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_KEY });

export default {
    definition: {
        "name": "extractPageContent",
        "description": "Extracts the main content from a given webpage URL",
        "parameters": {
            "type": "object",
            "properties": {
                "url": { "type": "string", "description": "The URL of the webpage to extract content from" }
            },
            "required": ["url"]
        }
    },
    handler: async ({ url }) => {
        const scrapedData = await app.scrapeUrl(url);
        return scrapedData && scrapedData.success ? scrapedData.data.content : null;
    }
};
