import { OpenAI } from "openai";
import functions from "./commands.json"

interface FunctionCall {
    name: string;
    arguments: string;
}

interface CompletionResponse {
    function_call: FunctionCall;
    content: string;
}

const openai = new OpenAI({apiKey: Bun.env.OPENAI_API_KEY});

async function getCompletion(command: string): Promise<CompletionResponse> {
    const completion = await openai.chat.completions.create({
        messages: [
            { role: "system", content: "Generate a bash command for the user message that follows this one." },
            { role: "user", content: command }
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.9
    });
    
    return completion.choices[0].message as CompletionResponse;
}


export async function executeCommand(command: string): Promise<string> {
    try {
        const { function_call } = await getCompletion(command);

        const args = JSON.parse(function_call.arguments);
        const proc = Bun.spawn([function_call.name, function_call.arguments])

        const output = await new Response(proc.stdout).text();
        return output
    }
    catch (e) {
        console.log(e)
        return(e);
    }
}
