# Pinterest Idea Search — WebMCP demonstration

A small, stateless page that turns one idea into a Pinterest search link. A
person using the form and an agent using the page's WebMCP tool both call the
same operation and see the same result.

Live page: <https://pinterest-webmcp-demo.vercel.app>

## What it does

The page registers one imperative WebMCP tool:

```text
prepare_pinterest_idea_search({ query }) -> { query, url }
```

The operation removes outer whitespace, accepts 1–200 Unicode code points,
and builds only this address shape:

```text
https://www.pinterest.com/search/pins/?q=<encoded query>
```

It updates the visible result on the current page. It never opens Pinterest
automatically, fetches Pins, stores a query, asks for an account, or sends data
to a project-controlled service.

## Run locally

The static site needs no installation or build step. Node.js runs its tests
and the optional ChatGPT MCP server.

```sh
python3 -m http.server 4173
```

Open <http://127.0.0.1:4173>. WebMCP availability depends on the browser; the
ordinary form remains usable when WebMCP is unavailable or registration fails.

## Verify

```sh
npm test
```

The tests independently check the shared query contract, fixed destination,
human–agent state equality, WebMCP lifecycle, deterministic UUID version 5
identities, chronological UUID version 7 evidence, and the absence of network,
storage, and automatic-navigation code.

The two runtime files are deliberate:

- `index.html` contains the visible page and styles.
- `app.js` contains the operation, page adapter, and WebMCP adapter.

This revises the earlier one-file sketch so the important logic can be imported
and checked without adding a build system. A rebuild copies both files.

## Review map

Review can stay small and mechanical:

1. Read the machine contract in
   [`knowledge/contracts/pinterest-idea-search.md`](knowledge/contracts/pinterest-idea-search.md).
2. Run `npm test`.
3. Submit one valid value and one whitespace-only value in the browser.
4. Confirm that only a user click can open the prepared Pinterest link.

Stable identities use UUID version 5. Actual observed transitions use UUID
version 7 and are recorded in
[`knowledge/evidence/state-transitions.jsonl`](knowledge/evidence/state-transitions.jsonl).
The bundle index is [`knowledge/index.md`](knowledge/index.md).

## ChatGPT app and plugin

The site includes Japanese guidance and three one-click search examples.
The optional [ChatGPT integration](integrations/README.md) shares the same URL
builder and adds an inline search form. Its dependencies are isolated from the
static site. The [skill plugin](plugins/pinterest-idea-search/) helps turn ideas
into search queries using available WebMCP/MCP tools.

## Primary references

- [WebMCP Community Group Draft](https://webmachinelearning.github.io/webmcp/)
- [Chrome imperative WebMCP guide](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [ChatGPT site-tools guide](https://learn.chatgpt.com/docs/webmcp)
- [Open Knowledge Format version 0.2](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md)

## License

[MIT](LICENSE)
