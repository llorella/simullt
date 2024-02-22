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
    const cacheControl = "public, max-age=86400"; 

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  } catch (e) {
    console.error(`Error serving ${filePath}:`, e.message);
    return new Response("Not Found", { status: 404 });
  }
}

async function serveTemplate(name: string, context: Record<string, any>): Promise<Response> {
  try {
    const templatePath = `./templates/${name}.html`;
    let templateContent = await Bun.file(templatePath).text();
    const content = renderTemplate(templateContent, context);
    const CSP_HEADER_VALUE = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'";

    return new Response(content, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Security-Policy': CSP_HEADER_VALUE,
      },
    });
  } catch (e) {
    console.error(`Error rendering template ${name}:`, e.message);
    return new Response("Not Found", { status: 404 });
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
    heading: 'little language terminal', 
    message: 'llt> (enter command)',
    year: getCurrentYear() 
  }),
  '/execute-command': async (req) => {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
  
    try {
      const formData = await req.formData();
      const command = formData.get('command');
      if (typeof command !== 'string') {
        throw new Error('Invalid command');
      }
  
      const result = await executeCommand(command);
      return new Response(result, {
        headers: { 'Content-Type': 'application/text' },
      });
    } catch (e) {
      console.error(`Error executing command:`, e.message);
      return new Response("Internal Server Error", { status: 500 });
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
