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

async function getCompletions(prompt: string): Promise<CompletionResponse> {
    const completion = await openai.chat.completions.create({
        messages: [
            { role: "system", content: "Assistant is in an llt mood today. Assistant will be given two user messages. The first user message contains the command log of the llt programmer. The second user message will describe an llt user's desired command. Assistant's job is to map the second user message to an llt command. Deduce user intent. Never leave a parameter value blank. Be creative.  and formulate tool invokation of llt. Always review your tool choice and provide a thorough explanation for your tool choice. If you realize that the tool choice is not appropriate, you can reject the command and provide feedback to the user. Don't be afraid to think out loud." },
            { role: "user", content: await Bun.file("llt.txt").text()},
            { role: "user", content: prompt }
        ],
        tools: lltools,
        tool_choice: {"type": "function", "function": {"name": "llt"}},
        model: "gpt-4-turbo",
        temperature: 1.1
    });
    console.log(completion);
    console.log(completion.choices[0].message);
    
    return completion.choices[0].message as CompletionResponse;
}

export async function cmdQuery(query: string): Promise<any> {
    try {
        const { tool_calls, content } = await getCompletions(query);
        console.log("Content:\n" + content + "\nFunction:\n" + JSON.stringify(tool_calls[0].function));
        return { content: content, command: assembleCommand(tool_calls[0].function) };
    } catch (e) {
        console.error(e);
        return e;
    }
}

