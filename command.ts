import { OpenAI } from "openai";
import functions from "./commands.json"; 
import { $ } from "bun";

interface FunctionCall {
    name: string;
    arguments: any;
}

interface CompletionResponse {
    function_call: FunctionCall;
    content: string;
}

async function getCompletions(command: string, functions: any): Promise<CompletionResponse> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
        messages: [
            { role: "user", content: command }
        ],
        functions: functions,
        model: "gpt-4",
        temperature: 0.7
    });

    return completion.choices[0].message as CompletionResponse;
}

export async function executeCommand(command: string): Promise<any> {
    try {
        const { function_call, content } = await getCompletions(command, functions);
        const args = JSON.parse(function_call.arguments)
        const proc = Bun.spawn([function_call.name, args.path])
        console.log(args)
        const output = await new Response(proc.stdout, { 
            'headers': { 'Content-Type': args.content_type}
        });
        return output; 
        
    } catch (e) {
        console.error(e);
        return e;
    }
}

