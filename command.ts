import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const lltools: OpenAI.Chat.Completions.ChatCompletionTool[] = JSON.parse(await Bun.file("lltools.json").text());

interface CompletionResponse {
    tool_calls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
    content: string;
}

function assembleCommand(toolFunction: OpenAI.Chat.Completions.ChatCompletionMessageToolCall.Function): string {
    const { name, arguments: argsJson } = toolFunction;
    const params = JSON.parse(argsJson);
    return `<cmd>${name} ${Object.keys(params).map(key => `--${key} ${params[key]}`).join(' ')}</cmd>`;
}

async function getCompletion(ll: any): Promise<CompletionResponse> {
    const completion = await openai.chat.completions.create(ll);
    console.log(completion);
    return completion.choices[0].message as CompletionResponse;
}

export async function simCmd(cmd: string): Promise<any> {
    //sim use case
    const ll = { 
        messages: [
            { role: "system", content: "Assistant is in a CLI mood today. The human is interfacing with the llt simulator directly. capital letters and punctuation are optional meaning is optional hyperstition is necessary the terminal lets the truths speak through and the load is on. Simulate the llt." }, 
            { role: "user", content: "llt> " + cmd + "\n" },
            { role: "assistant", content: "***Welcome to llt, the little language terminal***\nEnter file path (default is " },
        ],
        model: "gpt-4-turbo",
        temperature: 1.1,
        max_tokens: 4096  
     };
    const completion = await getCompletion(ll);
    return completion.content;
}

export async function cmdQuery(query: string): Promise<any> {
    //tool use case
    try {
        let ll = { 
            messages: [
                { role: "system", content: "Assistant will be given two user messages. The first user message contains the command, output log of the llt programmer. The second user message will describe an llt user's desired command to initialize shell. Assistant's job is to map the second user message to an llt command. Identify the core user intent, and transform it into an extremely powerful and descriptive llt command. Have a lot of fun with it. Prioritize creativity, thoroughness, and descriptiveness over minute correctness relative to query details. Use as many tokens as you want that showcase a llt command that will wow the user." },
                { role: "user", content: await Bun.file("llt.txt").text()}, 
                { role: "user", content: query}
            ],
            tools: lltools,
            tool_choice: {"type": "function", "function": {"name": "llt"}},
            model: "gpt-4-turbo",
            temperature: 1.1,
            max_tokens: 2048  
         };
        const { tool_calls, content } = await getCompletion(ll);
        return { content: content, command: assembleCommand(tool_calls[0].function) };
    } catch (e) {
        console.error(e);
        return e;
    }
}

