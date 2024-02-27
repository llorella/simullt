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

interface Command {
    content: string;
    content_type: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getCompletions(command: string, functions: any): Promise<CompletionResponse> {
    const completion = await openai.chat.completions.create({
        messages: [
            { role: "system", content: "Generate a bash command for the user message that follows this one. Only use ls and cat for now." },
            { role: "user", content: command }
        ],
        functions: functions,
        model: "gpt-3.5-turbo",
        temperature: 0.9
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

