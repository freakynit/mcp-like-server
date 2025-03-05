import { OpenAI } from "openai";
import axios from 'axios';
import 'dotenv/config';
import {init as initLogger, logger} from './logger.js';

const SERVER_PORT = process.env.SERVER_PORT;
const SERVER_AUTH_KEY = process.env.SERVER_AUTH_KEY;
const CHAT_LOG_LEVEL = process.env.CHAT_LOG_LEVEL;

initLogger(CHAT_LOG_LEVEL);

let toolsServerTools = [
    {"type":"function","function":{"name":"searchFunctions","description":"Searches for registered functions that match the given query. Uses semantic search for matching.","parameters":{"type":"object","properties":{"query":{"type":"string","description":"The search term to filter functions by name or description."}},"required":["query"]}}},
    {"type":"function","function":{"name":"executeFunction","description":"Executes a registered function by name with the provided arguments.","parameters":{"type":"object","properties":{"functionName":{"type":"string","description":"The name of the function to execute."},"arguments":{"type":"object","description":"A JSON object containing the arguments required by the function."}},"required":["functionName","arguments"]}}}
];

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
    baseURL: 'https://api.openai.com/v1'
});

async function sendMessage(messages, stream = false) {
    const result = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 2048,
        temperature: 0.7,
        stream,
        tools: toolsServerTools,
        tool_choice: "auto"
    });

    return result;

    if(stream) {
        let idx = 0;
        for await (const chunk of result) {
            // console.log(JSON.stringify(chunk, null, 2));
            if(chunk.choices && chunk.choices.length > 0) {
                if(idx++ == 0) {
                    process.stdout.write(`function: ${chunk.choices[0]?.delta?.tool_calls?.[0]?.function?.name}\n`);
                    process.stdout.write('arguments: ');
                }
                process.stdout.write(chunk.choices[0]?.delta?.tool_calls?.[0]?.function?.arguments || '');
            } else {
                console.log(`\n=== usage ===\n`, chunk.usage);
            }
        }
    } else {
        console.log(JSON.stringify(result, null, 2));
        // result?.choices?.forEach(choice => console.log(choice?.message?.content));
    }
}

async function getUserDataInput() {
    return new Promise((resolve) => {
        process.stdin.once('data', (data) => {
            resolve(data.toString().trim());
        });
    });
}

async function handleToolCall(functionName, functionArguments) {
    if(functionName === 'searchFunctions') {
        const query = functionArguments.query;

        const result = await axios.request({
            method: 'get',
            maxBodyLength: Infinity,
            url: `http://localhost:${SERVER_PORT}/api/functions/search?query=${query}`,
            headers: {
                'Authorization': `Bearer ${SERVER_AUTH_KEY}`
            }
        });

        return result.data;
    } else if(functionName === 'executeFunction') {
        let data = JSON.stringify({
            "name": functionArguments.functionName,
            "arguments": functionArguments.arguments
        });

        const result = await axios.request({
            method: 'post',
            maxBodyLength: Infinity,
            url: `http://localhost:${SERVER_PORT}/api/functions/execute`,
            headers: {
                'Authorization': `Bearer ${SERVER_AUTH_KEY}`,
                'Content-Type': 'application/json'
            },
            data : data
        });

        return result.data;
    } else {
        let data = JSON.stringify({
            "name": functionName,
            "arguments": functionArguments
        });

        const result = await axios.request({
            method: 'post',
            maxBodyLength: Infinity,
            url: `http://localhost:${SERVER_PORT}/api/functions/execute`,
            headers: {
                'Authorization': `Bearer ${SERVER_AUTH_KEY}`,
                'Content-Type': 'application/json'
            },
            data : data
        });

        return result.data;
    }
}

async function chatLoop() {
    const exitWords = ["exit", "quit", "bye"];
    const userChatPrompt = `Query (${exitWords.join("/")} to exit)...`;

    const stream = false;
    let messages = [];

    while (true) {
        messages = [];  // We are not keeping history for simplicity

        process.stdout.write(userChatPrompt);
        const userChatInput = await getUserDataInput();

        if (exitWords.includes(userChatInput.toLowerCase())) {
            console.log("Goodbye!");
            process.exit(0);
        }

        messages.push({ role: "user", content: userChatInput });

        const result = await sendMessage(messages, stream);
        logger.debug(`[LLM Response]\n${JSON.stringify(result, null, 2)}`);

        let content = result?.choices?.[0]?.message?.content;
        let toolCalls = result?.choices?.[0]?.message?.tool_calls;

        if(content) {
            logger.info(`[Final Answer]\n${typeof content === 'object' ? JSON.stringify(content) : content}`);
        } else {
            // Step-1: search for requested function
            let functionName = toolCalls[0]?.function?.name;
            let functionArguments = JSON.parse(toolCalls[0]?.function?.arguments);

            logger.debug(`[Tool call requested]\n${functionName}\n${JSON.stringify(functionArguments, null, 2)}`);

            let toolCallResult = await handleToolCall(functionName, functionArguments);
            logger.debug(`[LLM Response]\n${JSON.stringify(toolCallResult.result, null, 2)}`);

            // Step-2: add matching function to tool definitions
            const copyOfToolsServerTools = JSON.parse(JSON.stringify(toolsServerTools));

            for(const availableTool of toolCallResult?.result) {
                toolsServerTools.push({
                    "type": "function",
                    "function": availableTool?.definition
                });
            }

            // Step-3: make original chat request again... this time the LLM should output tool call corresponding to newly added tool
            const result = await sendMessage(messages, stream);
            logger.debug(`[LLM Response]\n${JSON.stringify(result, null, 2)}`);

            toolsServerTools = copyOfToolsServerTools;  // restore original tool definitions

            content = result?.choices?.[0]?.message?.content;
            toolCalls = result?.choices?.[0]?.message?.tool_calls;

            if(content) {   // should NOT match just yet
                logger.info(`[Final Answer]\n${typeof content === 'object' ? JSON.stringify(content) : content}`);
            } else {
                functionName = toolCalls[0]?.function?.name;
                functionArguments = JSON.parse(toolCalls[0]?.function?.arguments);

                logger.debug(`[Tool call requested]\n${functionName}\n${JSON.stringify(functionArguments, null, 2)}`);

                toolCallResult = await handleToolCall(functionName, functionArguments);
                logger.info(`[Final Answer]\n${typeof content === 'object' ? JSON.stringify(toolCallResult.result) : toolCallResult.result}`);
            }
        }
    }
}

(async () => {
    await chatLoop();
})()