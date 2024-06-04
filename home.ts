import { serve } from "bun";
import { cmdQuery, simCmd } from "./command";

const logfile = ".logcmd";

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.ico': 'image/x-icon', 
  '.png': 'image/png',
};

async function serveStatic(filePath: string): Promise<Response> {
  try {
    if (filePath.includes('..') || filePath.includes('%')) {
      return new Response('Bad Request', { status: 400 });
    }
    if (filePath.endsWith("/")) {filePath+="index.html"}
    const contentType = MIME_TYPES[filePath.slice(filePath.lastIndexOf('.'))] || 'application/octet-stream';
    console.log("contentType: ", contentType);
    const content = Bun.file(`public/${filePath}`); 
    console.log("content.type: ", content.type);
    return new Response(content, {
      headers: {
        'Content-Type': contentType      },
    }); 
  } catch (e) {
    console.error(`Error serving ${filePath}:`);
    return new Response("Not Found", { status: 404 });
  }
}

function renderTemplate(templateContent: string, context: Record<string, any> = {}): string {
  return Object.entries(context).reduce((content, [key, value]) => {
    const escapedValue = String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    return content.replace(regex, escapedValue);
  }, templateContent);
} */

function getCurrentYear(): string {
  return new Date().getFullYear().toString();
}

async function logcmd(ll: any) {
  let cmds = Object.keys(ll)
    .map(key => `${key}: ${ll[key]}`)
    .join("\n") + "\n\n";
  try {
    const llcmds = await Bun.file(logfile).text();
    await Bun.write(logfile, llcmds.concat(cmds));
  } catch (error) {
    console.error(error);
  }
}

const routes: Record<string, (req: Request) => Promise<Response>> = {
   '/ll': async (req) => {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    try {
      const formData = await req.formData();
      const query = formData.get('query');
      if (typeof query !== 'string') {
        throw new Error('Invalid query');
      }
      const { content, command } = await cmdQuery(query);
      const description = content == null ? "Description not provided" : content; //maybe add separate call to provide explanation
      await logcmd({ query, command, description });
      return new Response(command, { status: 200 })
    } catch (e: any) {
      console.error(`Error executing command:`, e);
      return new Response(e.message, { status: 500 });
    }
  },
  '/simullt': async (req) => {
    const command = await req.blob().then(data => data.text());
    await logcmd({ command: command, feedback: 'run' }); 
      const headers = new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          const sendEvent = async () => {
            try {
              const completion = await simCmd(command);
              for await (const chunk of completion) {
                const data = JSON.stringify(chunk);
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            } catch (error: any) {
              controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(error.message)}\n\n`));
            }
          };
          sendEvent().then(() => controller.close());
        }
      });
      return new Response(stream, { headers });
    },
    '/reject': async (req) => {
      const formData = await req.formData();
      const command = formData.get('command');
      await logcmd({ command: command, feedback: 'reject' }); 
      return new Response("Thank you for your feedback. Your input will be reviewed and used for improving the teleprompter.", { status: 200 });
    }
};

serve({
  port: 3000,
  fetch(req: Request) {
    const url = new URL(req.url);
    console.log("url pathname: ", url.pathname);
    const handler = routes[url.pathname];
    console.log("handler: ", handler);
    if (handler) {
      console.log(handler);
      return handler(req);

    } else {
      console.log("no handler");
      return serveStatic(url.pathname);
    }
  },
});

console.log("Server running on port 3000...");