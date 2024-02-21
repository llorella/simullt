import { serve } from "bun";

// MIME type mapping, including corrected entry for favicon
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.ico': 'image/x-icon', // Corrected MIME type for favicon
  '.png': 'image/png',
  // Add more MIME types as needed
};

// Serve static files from the public directory with enhanced security and caching
async function serveStatic(filePath: string): Promise<Response> {
  try {
    // Enhanced validation to prevent directory traversal attacks
    if (filePath.includes('..') || filePath.includes('%')) {
      return new Response('Bad Request', { status: 400 });
    }

    const contentType = MIME_TYPES[filePath.slice(filePath.lastIndexOf('.'))] || 'application/octet-stream';
    const content = Bun.file(`./public/${filePath}`); // Assuming static files are in the 'public' directory
    const cacheControl = "public, max-age=86400"; // 1 day cache for static content

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

// Serve templates with optional context for dynamic content, implementing CSP
async function serveTemplate(name: string, context: Record<string, any>): Promise<Response> {
  try {
    const templatePath = `./templates/${name}.html`;
    let templateContent = await Bun.file(templatePath).text();
    const content = renderTemplate(templateContent, context);
    const CSP_HEADER_VALUE = "default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline'; object-src 'none'";

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

// Render a template with context, properly escaping HTML
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

// Dynamic content or API routes
const routes: Record<string, (req: Request) => Promise<Response>> = {
  '/': async () => serveTemplate('index', { 
    heading: 'little language terminal', 
    message: 'llt> (enter command)',
    year: getCurrentYear() 
  }),
  // Example for serving a static HTML page as dynamic route
  // '/about': () => serveStatic('/about.html'),
  // Add more routes as needed
};

serve({
  port: 3000,
  fetch(req: Request) {
    const url = new URL(req.url);
    // Check if the request URL matches any predefined routes
    const handler = routes[url.pathname];
    if (handler) {
      // Handle predefined routes (e.g., dynamic content or specific endpoints)
      return handler(req);
    } else {
      // Attempt to serve as a static file from the public directory
      return serveStatic(url.pathname);
    }
  },
});

console.log("Server running on port 3000...");
