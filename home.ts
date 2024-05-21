import { serve } from "bun";
import { executeCommand } from "./command";

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

    const contentType = MIME_TYPES[filePath.slice(filePath.lastIndexOf('.'))] || 'application/octet-stream';
    const content = Bun.file(`./public/${filePath}`); 

    return new Response(content, {
      headers: {
        'Content-Type': contentType
      },
    });
  } catch (e) {
    console.error(`Error serving ${filePath}:`, e.message);
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
  } catch (e) {
    console.error(`Error rendering html template ${name}:`, e.message);
    return new Response(e.message, { status: e.status });
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
      const result: string= await executeCommand(query);
      return new Response(result, { status: 200 })
    } catch (e) {
      console.error(`Error executing command:`, e.message);
      return new Response(e.message, { status: e.status });
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