import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createHttpServer } from './server.mjs';
import { createPinterestSearch } from '../../app.js';
const http = createHttpServer();
await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
const url = new URL(`http://127.0.0.1:${http.address().port}/mcp`);
const client = new Client({ name: 'pinterest-check', version: '1.0.0' });
try {
  await client.connect(new StreamableHTTPClientTransport(url));
  const {tools} = await client.listTools();
  assert.equal(tools.length, 1);
  assert.equal(tools[0]._meta.ui.resourceUri, 'ui://pinterest/search-v1.html');
  for(const query of ['  水中の光 & prism  ', '😀'.repeat(200)]) {
    const result = await client.callTool({ name: tools[0].name, arguments: {query} });
    assert.deepEqual(result.structuredContent, createPinterestSearch(query));
  }
  for(const query of ['   ', '😀'.repeat(201)]) {
    const result = await client.callTool({ name: tools[0].name, arguments: {query} });
    assert.equal(result.isError, true);
  }
  const resource = await client.readResource({uri:tools[0]._meta.ui.resourceUri});
  assert.equal(resource.contents[0].mimeType, 'text/html;profile=mcp-app');
  assert.match(resource.contents[0].text, /ui\/initialize/);
  console.log('PASS: MCP initialize, discovery, Unicode boundaries, shared output equality, errors, widget resource');
} finally { await client.close(); await new Promise(resolve=>http.close(resolve)); }
