# ChatGPT app / Plugin / Sites

The MCP server imports the site's `createPinterestSearch` directly. It returns
search links and an interactive HTML widget; it does not retrieve or save Pins.
The site remains dependency-free. Only this optional integration needs packages.

## Run and check

From the repository root:

```sh
npm ci --prefix integrations/chatgpt
npm run check --prefix integrations/chatgpt
npm start --prefix integrations/chatgpt
```

The server listens on `http://127.0.0.1:8787/mcp` (`PORT` is configurable).
`/health` returns `ok`. To connect from ChatGPT, expose the server through an
HTTPS tunnel or an appropriate host, then follow the
[official connection instructions](https://developers.openai.com/plugins/build/app-quickstart#connect-your-mcp-server-in-chatgpt).
Refresh the connection after changing tools or UI metadata.

`check` uses the official MCP client to verify HTTP initialization, discovery,
shared output equality, Unicode limits, error results, and the widget resource.
ChatGPT account registration, in-host rendering, and public distribution are
separate steps and have not been verified by this repository's checks.

## Skill plugin

[`plugins/pinterest-idea-search`](../plugins/pinterest-idea-search/) contains the
manifest and skill. It uses an available WebMCP/MCP tool, or prepares an encoded
search link itself. It does not install the MCP server. Packaging needs no script:

```sh
git archive --format=zip --output=plugins/pinterest-idea-search.zip HEAD:plugins/pinterest-idea-search
```

See [Build plugins](https://learn.chatgpt.com/docs/build-plugins) for installation.
The manifest and skill are validated; installation in the host remains untested.

## Sites

Sites uses the same `index.html` and `app.js`. This workspace also has an ignored,
independent checkout at `integrations/sites/`; its `.openai/hosting.json` owns the
existing private Site. Reuse that ID, synchronize the two files into `out/`, and
publish through Sites. Account-specific hosting data is not included here.

## Design references

- [MCP server and UI quickstart](https://developers.openai.com/plugins/build/app-quickstart)
- [UI metadata and bridge](https://developers.openai.com/plugins/build/chatgpt-ui)
- [Site tools / WebMCP](https://learn.chatgpt.com/docs/webmcp)
