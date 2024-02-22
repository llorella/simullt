import { OpenAI } from "openai";
import functions from "./commands.json"; 

interface FunctionCall {
    name: string;
    arguments: any;
}

interface CompletionResponse {
    function_call: FunctionCall;
    content: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getCompletions(command: string, functions: any): Promise<CompletionResponse> {
    const completion = await openai.chat.completions.create({
        messages: [
            { role: "system", content: "Generate a bash command for the user message that follows this one." },
            { role: "user", content: command }
        ],
        functions: functions,
        model: "gpt-3.5-turbo",
        temperature: 0.9
    });
    console.log(completion.choices[0]);
    console.log(completion.choices[0].message);

    return completion.choices[0].message as CompletionResponse;
}

export async function executeCommand(command: string): Promise<string> {
    try {
        const { function_call, content } = await getCompletions(command, functions);
        const args = JSON.parse(function_call.arguments)
        const proc = Bun.spawn([function_call.name, args.path])
        const output = await new Response(proc.stdout).text();
        return output;
    } catch (e) {
        console.error(e);
        return e;
    }
}
