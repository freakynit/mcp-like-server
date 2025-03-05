This is MCP server like custom implementation created for understanding the core concepts behind such tools. This was done in under 3 hours end to end, so, no focus is given to code quality or anything else. This is purely for learning (and experimentation).

### Sample Chat Runs
> Log level was set to info, not debug, for these, hence, no background messages are shown.

#### Search for latest US politics news
```text
> custom-mcp-server-implementation@1.0.0 example_chat
> node src/example_chat.js

Query (exit/quit/bye to exit)...search for latest US politics news
info: [Final Answer]
[{"type":"ORGANIC","link":"https://www.cnn.com/politics","description":"The IRS is drafting plans to cut as much as half of its 90,000-person workforce, sources say � Trump says US has apprehended 'top terrorist' responsible for�...","title":"Politics - CNN"},{"type":"ORGANIC","link":"https://www.nbcnews.com/politics","description":"Find the latest political news stories, photos, and videos on NBCNews.com. Read breaking headlines covering Congress, Democrats, Republicans, and more. �  �  � ","title":"Politics: Latest news and headlines | NBC News"},{"type":"ORGANIC","link":"https://www.nytimes.com/international/section/politics","description":"Breaking news and analysis on U.S. politics, including the latest coverage of the White House, Congress, the Supreme Court and more. �  �  � ","title":"U.S. Politics - The New York Times International"},{"type":"ORGANIC","link":"https://www.theguardian.com/us-news/us-politics","description":"President Donald Trump addresses a joint session of Congress at the US Capitol. Trump touts renewal of rightwing policies in lengthy speech as Democrats jeer,�...","title":"US politics | The Guardian"},{"type":"ORGANIC","link":"https://www.politico.com/politics","description":"Protesters rally in support of Ukraine outside the U.S. Capitol. Trump: Zelenskyy says Ukraine is ready for peace. By DASHA BURNS. 03/�... �  � ","title":"Latest and breaking political news today - POLITICO"},{"type":"ORGANIC","link":"https://abcnews.go.com/Politics","description":"Trump orders a 'pause' on military aid to Ukraine. The move followed a fiery Oval Office meetup of the U.S. and Ukraine leaders. March 03. �  � ","title":"Breaking Political News, Video & Analysis-ABC News"},{"type":"ORGANIC","link":"https://www.bbc.com/news/topics/cwnpxwzd269t","description":"7 hours ago � The president declares \"America is back\" as he soaks up Republican ovations and spars with Democrats. Just now. World.","title":"US politics - BBC News"},{"type":"ORGANIC","link":"https://www.independent.co.uk/news/world/americas/us-politics","description":"US politics � Truth behind the US economy and where it's heading after Trump tariffs � Stock markets drop as Trump's tariffs with Mexico and Canada begin. �  � ","title":"US Politics | Latest news, comment and analysis - The Independent"},{"type":"ORGANIC","link":"https://www.politico.com/","description":"Democrats Are Serious About a Shutdown � Republicans squirm as Trump's tariffs come for their states � Zelenskyy says it is 'time to make things right' after Oval�... �  �  � ","title":"Politics, Policy, Political News - POLITICO"}]
Query (exit/quit/bye to exit)...
```

#### Server CPU count
```text
> custom-mcp-server-implementation@1.0.0 example_chat
> node src/example_chat.js

Query (exit/quit/bye to exit)...tell me server cpu count
info: [Final Answer]
8
Query (exit/quit/bye to exit)...
```

#### No tool call and then page scrape tool call
```text
> custom-mcp-server-implementation@1.0.0 example_chat
> node src/example_chat.js

Query (exit/quit/bye to exit)...how are you doing today?
info: [Final Answer]
I'm just a computer program, so I don't have feelings, but I'm here and ready to help you with whatever you need! How can I assist you today?
Query (exit/quit/bye to exit)...extract this page content: https://example.com/
info: [Final Answer]
# Example Domain

This domain is for use in illustrative examples in documents. You may use this
domain in literature without prior coordination or asking for permission.

[More information...](https://www.iana.org/domains/example)
Query (exit/quit/bye to exit)...quit
```

### Installation and Running
1. Set up qdrant vector store. See below (Setup Qdrant as Vector Store)
2. Clone the repo
3. Copy `.env.example` to `.env` and fill needed values. `FIRECRAWL_KEY` is only needed if you want to use page scraping tool. Others are needed.
4. Set `CHAT_LOG_LEVEL` to `debug` for the time being.
5. Start server (make sure `qdrant` is running with everything default): `npm run server`.
6. In another window, start sample chat loop that transparently uses this MCP-like server for tool invocations: `npm run example_chat`.
7. Try with simple message first that does NOT need to call any tool: `how are you doing`.
8. Now, let's test tool call. A few tools are available in `functions` directory. Check them out.
9. Type: `search for latest US politics news`. A lot of messages will appear on console.. those are debug messages. Final results are prefixed with `Final Answer`. You can also set log level to `info` to only see final answers.
10. Another one: `tell me server cpu count`.
11. FireCrawl test (signup for a free key): `extract this page content: https://example.com/`.
12. Confusing one: `Add these numbers: 10, 20`. Why this is confusing? Because for such simple addition, LLM's do NOT need to rely on tool calls. Hence, this is NOT using any tool call.
13. Let's force tool call for this one: `Add these numbers: 10, 20 using tool call`. This time, our tool: `functions/add_numbers.js` is called. Enable `debug` logging any time to see behind-the-scenes messages.

### Setup Qdrant as Vector Store
```shell
docker run -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage \
    qdrant/qdrant
```
UI at: http://localhost:6333/dashboard

### Understanding what's happening behind the scenes
1. Broadly speaking, MCP exposes two endpoints: first to query for registered functions/tools, and second one to execute chosen function with arguments.
2. This choice of function to execute is performed by the LLM.
3. If you look at our [chat code](src/example_chat.js), you'll see we have, in the beginning itself, defined two such functions/tools using variable: `toolsServerTools`.
4. These correspond EXACTLY to two [server](src/server.js) endpoints: `/api/functions/search` and `/api/functions/execute`.
5. The chat loop basically adds these two tool call definitions to every user chat message.
6. It then relies on LLM deciding whether current question can be answered natively (without relying on any external tool), or it needs the help of a tool to correctly answer user's question.
7. Important to keep in mind: as of NOW (first user chat message), it does **NOT** have any knowledge of registered tools/functions. It simply knows there is a `tool` that it can use to `search` for functions (or more tools), one of which might be able to answer user's question.
8. This is where the first registered tool in `toolsServerTools` comes into play.
9. Now, the LLM responds back with tool call in its response. This is caught by the example_chat loop:
    ```javascript
    let content = result?.choices?.[0]?.message?.content;
    let toolCalls = result?.choices?.[0]?.message?.tool_calls;

    if(content) {
        logger.info(`[Final Answer]\n${typeof content === 'object' ? JSON.stringify(content) : content}`);
    } else {
        // ... tool call caught here    
    }
    ```
10. Now, `handleToolCall` method is called after extracting function/tool name and it's corresponding arguments. Since this is first tool call, this is actually `searchFunctions` tool call corresponding to our `/api/functions/search` endpoint.
11. We call this endpoint with arguments given by LLM, and in return, receive most applicable functions (top-3 for now). These are then added to existing `toolsServerTools` variable:
    ```javascript
    for(const availableTool of toolCallResult?.result) {
        toolsServerTools.push({
            "type": "function",
            "function": availableTool?.definition
        });
    }
    ```
12. Now, original message is sent again, but this time, our LLM `already` has access to most probable function(s) that can `finally`, answer user's question (since we have added searched function as shown above).
13. Now, LLM responds back with the final tool call and corresponding arguments. We call `handleToolCall` method yet again, but this time, the final `else` case matches with correct registered function and corresponding arguments are passed to it.
14. This tool is executed by our server on `/api/functions/execute` endpoint.
15. The result from this function/tool/server-api call is the final answer that is shown to the user.
16. Do note that this chat loop does NOT keep chat history. This is one-shot chat only.

### Example flows for various inputs
1. `how are you doing` => user -> llm -> done.
2. `search for latest US politics news` => user -> llm -> tool call (`searchFunctions`) => [top 3 matching functions] => add these to tool call definitions => LLM call again => tool call (`googleSearch`) => final result => user.
3. `extract this page content: https://example.com/` => similar flow as above, but, second tool call is `extractPageContent`.
