export default {
    definition: {
        name: 'addNumbers',
        description: 'Adds two numbers together',
        parameters: {
            type: 'object',
            properties: {
                a: { type: 'number' },
                b: { type: 'number' }
            },
            required: ['a', 'b']
        }
    },
    handler: async ({ a, b }) => a + b
};
