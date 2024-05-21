import { serve } from "bun";
import { executeCommand } from "./command";

const logfile = ".logcmd";

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.ico': 'image/x-icon', 
  '.png': 'image/png',
};

type llcmd = { query: string, command: string, description: string };

async function serveStatic(filePath: string): Promise<Response> {
  try {
    if (filePath.includes('..') || filePath.includes('%')) {
      return new Response('Bad Request', { status: 400 });
    }
    const contentType = MIME_TYPES[filePath.slice(filePath.lastIndexOf('.'))] || 'application/octet-stream';
    const content = Bun.file(`./public/${filePath}`); 
    return new Response(content, {
      headers: {
        'Content-Type': contentType
      },
    });
  } catch (e) {
    console.error(`Error serving ${filePath}:`);
    return new Response("Not Found", { status: 404 });
  }
}

async function serveTemplate(name: string, context: Record<string, any>): Promise<Response> {
  try {
    const html = renderTemplate(await Bun.file(`./templates/${name}.html`).text(), context);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html'
      },
    });
  } catch (e: any) {
    console.error(`Error rendering html template ${name}:`, e.message);
    return new Response(e.message, { status: 500 });
  }
}

function renderTemplate(templateContent: string, context: Record<string, any> = {}): string {
  return Object.entries(context).reduce((content, [key, value]) => {
    const escapedValue = String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    return content.replace(regex, escapedValue);
  }, templateContent);
}

function getCurrentYear(): string {
  return new Date().getFullYear().toString();
}

async function logcmd(cmd: llcmd) {
  let llcmd = Object.keys(cmd)
    .map(key => `${key}: ${cmd[key as keyof llcmd]}`)
    .join("\n") + "\n\n";
  try {
    const llcmds = await Bun.file(logfile).text();
    await Bun.write(logfile, llcmds.concat(llcmd));
  } catch (error) {
    console.error("Failed to write to file:", error);
  }
}

const routes: Record<string, (req: Request) => Promise<Response>> = {
  '/': async () => serveTemplate('index', { 
    heading: "little language terminal", 
    year: getCurrentYear() 
  }),
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
      const { content, command } = await executeCommand(query);
      const description = content == null ? "Description not provided" : content;
      await logcmd({ query, command, description });
      return new Response(command, { status: 200 })
    } catch (e: any) {
      console.error(`Error executing command:`, e);
      return new Response(e.message, { status: 500 });
    }
  }
};

serve({
  port: 3000,
  fetch(req: Request) {
    const url = new URL(req.url);
    const handler = routes[url.pathname];
    if (handler) {
      return handler(req);
    } else {
      return serveStatic(url.pathname);
    }
  },
});

console.log("Server running on port 3000...");