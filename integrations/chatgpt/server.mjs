import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { createPinterestSearch, WEBMCP_TOOL_NAME } from '../../app.js';

const mimeType = 'text/html;profile=mcp-app';
const uri = 'ui://pinterest/search-v1.html';
const html = readFileSync(new URL('./widget.html', import.meta.url), 'utf8');
export function createPinterestServer() {
  const server = new McpServer({ name: 'pinterest-idea-search', version: '0.2.0' });
  server.registerResource('pinterest-search', uri, { mimeType }, async () => ({ contents: [{
    uri, mimeType, text: html,
    _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] } },
      'openai/widgetDescription': 'A prepared Pinterest search link. Images are viewed on Pinterest.' },
  }] }));
  server.registerTool(WEBMCP_TOOL_NAME, {
    title: 'Prepare Pinterest idea search',
    description: 'Use this when the user wants a Pinterest search link for a visual idea. Returns a link only; does not retrieve images, open Pinterest, or save Pins.',
    inputSchema: { query: z.string() },
    outputSchema: { query: z.string(), url: z.string() },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    _meta: { ui: { resourceUri: uri } },
  }, async ({ query }) => {
    try {
      const result = createPinterestSearch(query);
      return { structuredContent: result, content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error.message }] };
    }
  });
  return server;
}

export function createHttpServer() {
  return createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'text/plain' }).end('ok'); return;
    }
    if (path !== '/mcp') { res.writeHead(404).end(); return; }
    if (!['POST', 'GET', 'DELETE'].includes(req.method)) { res.writeHead(405, { Allow: 'POST, GET, DELETE' }).end(); return; }
    const server = createPinterestServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { void transport.close(); void server.close(); });
    try { await server.connect(transport); await transport.handleRequest(req, res); }
    catch { if (!res.headersSent) res.writeHead(500).end('MCP request failed'); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 8787);
  createHttpServer().listen(port, '127.0.0.1', () => console.log(`Pinterest MCP: http://127.0.0.1:${port}/mcp`));
}
