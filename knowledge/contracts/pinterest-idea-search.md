---
type: Interface Contract
title: Pinterest idea-search contract
description: One shared, stateless operation for a human form and an imperative WebMCP tool.
resource: ../../app.js
tags: [webmcp, static-site, pinterest, machine-contract]
status: stable
generated: { by: codex/gpt-5, at: 2026-09-04T09:20:33.272Z }
verified:
  - { by: process:node-test, at: 2026-09-04T09:03:42.239Z }
  - { by: codex/gpt-5, at: 2026-09-04T09:03:42.240Z }
  - { by: process:node-test, at: 2026-09-04T09:06:15.735Z }
  - { by: process:node-test, at: 2026-09-04T09:10:36.551Z }
  - { by: process:github-actions, at: 2026-09-04T09:18:40.160Z }
  - { by: service:vercel, at: 2026-09-04T09:18:40.161Z }
  - { by: codex:in-app-browser, at: 2026-09-04T09:18:40.162Z }
  - { by: codex:in-app-browser, at: 2026-09-04T09:20:33.272Z }
contract_uuid_v5: 834e99f2-bfae-5e12-ac87-a2df493dd5e3
sources:
  - id: product-brief
    source_uuid_v5: 91aa1316-fdae-5121-ad68-7237113a8937
    resource: https://chatgpt.com/share/6a9a840d-2cf8-83e8-8352-7937de77e43c
    title: Shared product brief and earlier implementation record
    author: human:project-owner
  - id: webmcp-draft
    source_uuid_v5: d1199046-2e97-545a-9223-ca9525882d10
    resource: https://webmachinelearning.github.io/webmcp/
    title: WebMCP Community Group Draft
    author: group:web-machine-learning-community-group
  - id: chrome-imperative-guide
    source_uuid_v5: 24af742c-720b-5032-8b63-b02957dbaca5
    resource: https://developer.chrome.com/docs/ai/webmcp/imperative-api
    title: Imperative WebMCP application programming interface guide
    author: team:chrome-developers
  - id: chatgpt-site-tools
    source_uuid_v5: 3f1fd3d0-037b-50ab-bd43-3266d62e6140
    resource: https://learn.chatgpt.com/docs/webmcp
    title: ChatGPT site-tools guide
    author: team:openai
  - id: open-knowledge-format
    source_uuid_v5: f856512d-9e04-51e5-98d8-0532e763caff
    resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
    title: Open Knowledge Format version 0.2
    author: team:google-cloud
---

# Intent

Prepare, but do not automatically open, one Pinterest search URL. The human
form and the agent tool must use the same operation and must leave the same
visible state.[^product-brief]

# Interface

Tool name: `prepare_pinterest_idea_search`

Input:

```json
{
  "query": "string"
}
```

Output:

```json
{
  "query": "trimmed string",
  "url": "https://www.pinterest.com/search/pins/?q=<encoded query>"
}
```

The tool is registered with `document.modelContext.registerTool` and an abort
signal, following the current imperative interface.[^webmcp-draft]
[^chrome-imperative-guide]

# Invariants

| Stable identity | Mechanically reviewable guarantee |
| --- | --- |
| `6814dd97-471f-5814-87c1-314a6e658ea9` | `query` is a string. Remove outer whitespace, then require 1–200 Unicode code points. |
| `cb9d83fc-3637-5a8f-ac9e-3b775a14326f` | Build only HTTPS origin `www.pinterest.com`, path `/search/pins/`, and one `q` parameter. |
| `661d9508-75f2-518d-9618-ad0b65585518` | Register exactly one tool and return the shared operation's raw JSON-serializable result. |
| `fa0a3e23-6812-53cb-ae7b-ce2a77c5c63f` | A human submission and an agent execution produce identical normalized input, visible query, link, and error behavior. |

The page performs no project-controlled network request, persistent storage,
credential access, automatic navigation, Pinterest content retrieval, or
remote mutation. The prepared link opens only after a person's click.
The form field has no submission name, and production policy blocks every form
action, so a script-start failure cannot transmit the query.

`readOnlyHint` is false because successful execution changes ephemeral visible
page state. `consequentialHint` is false because it does not cause an external
side effect. `untrustedContentHint` is false because the tool does not retrieve
third-party content.[^webmcp-draft]

# State transitions

```text
human_submit | WebMCP_execute
              |
              v
raw_query -> normalized_query -> validated_query -> prepared
                    |                  |
                    +---- invalid -----+-> visible_error

registration: checking -> ready | unavailable | error
lifecycle:    ready -> ready       when pagehide.persisted is true
lifecycle:    ready -> disposed    on explicit disposal or final page hide
```

WebMCP registration failure must never disable the ordinary form. A page kept
in the browser's back-forward cache keeps its registration alive.

# Identity derivation

UUID version 5 identities are independently reproducible. The project identity
uses the standard Domain Name System namespace. Every child identity uses the
project identity as its namespace.

| Namespace UUID | Canonical name | Derived UUID version 5 |
| --- | --- | --- |
| `6ba7b810-9dad-11d1-80b4-00c04fd430c8` | `https://github.com/Anionix/pinterest-webmcp-demo` | `d4ab699a-ad52-5afb-9c29-6a943d68062f` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `query-contract/v1` | `6814dd97-471f-5814-87c1-314a6e658ea9` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `pinterest-url-builder/v1` | `cb9d83fc-3637-5a8f-ac9e-3b775a14326f` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `prepare-pinterest-idea-search/v1` | `661d9508-75f2-518d-9618-ad0b65585518` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `human-agent-coherence/v1` | `fa0a3e23-6812-53cb-ae7b-ce2a77c5c63f` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `source/product-brief-share/v1` | `91aa1316-fdae-5121-ad68-7237113a8937` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `source/webmcp-cg-draft/v1` | `d1199046-2e97-545a-9223-ca9525882d10` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `source/chrome-webmcp-imperative/v1` | `24af742c-720b-5032-8b63-b02957dbaca5` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `source/chatgpt-site-tools/v1` | `3f1fd3d0-037b-50ab-bd43-3266d62e6140` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `source/open-knowledge-format-v0.2/v1` | `f856512d-9e04-51e5-98d8-0532e763caff` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `transition/restore-started/v1` | `33f469f3-698c-50f5-b826-ffa9c08e8e41` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `transition/source-restored/v1` | `255051e3-6137-553e-8258-a4b1f5a04ddd` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `transition/spec-checked/v1` | `bd025c7e-5595-5a00-821a-0b707b462b5c` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `transition/local-verified/v1` | `cc843ac0-8419-50ae-a5fa-5e0963bf7386` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `transition/browser-verified/v1` | `580e44d3-1526-56e4-a563-bb965cd5fc9e` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `transition/candidate-verified/v1` | `42015786-d39f-575d-8328-73625cf70672` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `transition/final-local-verified/v1` | `0ca0f9e4-db41-5dba-830a-a9f24c3aeea2` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `transition/public-repository-verified/v1` | `412246ce-d176-5583-a6fb-a5d349fdcea0` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `transition/preview-deployed/v1` | `237e11df-3cb5-5787-9adb-c1f54a02fe9b` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `transition/preview-webmcp-verified/v1` | `e0e7a766-db5b-5a53-b45c-679bffbce7b7` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `transition/preview-verification-complete/v1` | `7b655f47-c631-52a4-9e43-e297d1d5fd7e` |
| `d4ab699a-ad52-5afb-9c29-6a943d68062f` | `knowledge-record/v1` | `834e99f2-bfae-5e12-ac87-a2df493dd5e3` |

Actual observations use UUID version 7, not UUID version 5. Each observation
also records its occurrence time, sequence, before-state, after-state, subject,
and evidence in [`../evidence/state-transitions.jsonl`](../evidence/state-transitions.jsonl).

# Acceptance evidence

| Requirement | Deterministic check |
| --- | --- |
| Valid and invalid query boundary | `test/app.test.js` exercises type, whitespace, Unicode, and 200-code-point edges. |
| Fixed destination | Tests parse the URL and compare origin, path, fragment, and parameter names. |
| Human–agent equality | One test compares the complete visible-state snapshot after both paths. |
| Registration lifecycle | Tests cover unsupported, ready, synchronous failure, asynchronous failure, cached page hide, final page hide, and explicit disposal. |
| No hidden side effects | Static tests reject network, storage, automatic navigation, and form-action patterns. |
| Provenance and identities | `test/knowledge.test.js` recomputes UUID version 5 values and validates the evidence chronology. |
| Hosted behavior | Sequences 10–11 record real WebMCP discovery, execution, visible-state equality, reload rediscovery, and both ordinary form outcomes on an isolated Vercel preview. |

The architecture uses `index.html` and `app.js` instead of the earlier one-file
sketch so the operation is importable for deterministic tests without a build
step. Both files together are the static deployment unit.

[^product-brief]: Shared product brief and earlier implementation record.
[^webmcp-draft]: WebMCP Community Group Draft.
[^chrome-imperative-guide]: Chrome imperative WebMCP application programming interface guide.
