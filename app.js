export const PROJECT_UUID_V5 = 'd4ab699a-ad52-5afb-9c29-6a943d68062f';
export const UUID_V5_DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
export const MAX_QUERY_CODE_POINTS = 200;
export const PINTEREST_SEARCH_ORIGIN = 'https://www.pinterest.com';
export const WEBMCP_TOOL_NAME = 'prepare_pinterest_idea_search';

export const UUID_V5_CANONICAL_NAMES = Object.freeze({
  project: 'https://github.com/Anionix/pinterest-webmcp-demo',
  query: 'query-contract/v1',
  urlBuilder: 'pinterest-url-builder/v1',
  webMcpTool: 'prepare-pinterest-idea-search/v1',
  humanAgentCoherence: 'human-agent-coherence/v1',
});

export const CONTRACT_UUIDS_V5 = Object.freeze({
  query: '6814dd97-471f-5814-87c1-314a6e658ea9',
  urlBuilder: 'cb9d83fc-3637-5a8f-ac9e-3b775a14326f',
  webMcpTool: '661d9508-75f2-518d-9618-ad0b65585518',
  humanAgentCoherence: 'fa0a3e23-6812-53cb-ae7b-ce2a77c5c63f',
});

export const SOURCE_RECOVERY_EVENT_UUID_V7 =
  '01a06b9e-1196-76c6-a178-d05cc0bd54f2';

const PINTEREST_SEARCH_PATH = '/search/pins/';

/**
 * Machine contract — UUIDv5: 6814dd97-471f-5814-87c1-314a6e658ea9
 * Source-recovery evidence event — UUIDv7:
 * 01a06b9e-1196-76c6-a178-d05cc0bd54f2 (see knowledge/log.md)
 *
 * raw_query -> normalized_query -> validated_query -> prepared_search
 *                    |                  |
 *                    +---- invalid -----+-> visible_error
 *
 * Invariants: fixed Pinterest origin, no input-controlled navigation, no
 * network access, no persistence, and Unicode code-point length in [1, 200].
 *
 * @param {unknown} rawQuery
 * @returns {Readonly<{query: string, url: string}>}
 */
export function createPinterestSearch(rawQuery) {
  if (typeof rawQuery !== 'string') {
    throw new TypeError('Search query must be a string.');
  }

  const query = rawQuery.trim();
  const length = [...query].length;

  if (length === 0) {
    throw new RangeError('Enter an idea to search.');
  }

  if (length > MAX_QUERY_CODE_POINTS) {
    throw new RangeError(
      `Search query must be ${MAX_QUERY_CODE_POINTS} Unicode characters or fewer.`,
    );
  }

  const url = new URL(PINTEREST_SEARCH_PATH, PINTEREST_SEARCH_ORIGIN);
  url.searchParams.set('q', query);

  return Object.freeze({ query, url: url.href });
}

/**
 * Shared application boundary — UUIDv5: fa0a3e23-6812-53cb-ae7b-ce2a77c5c63f
 *
 * human_submit | WebMCP_execute -> prepare -> one visible result + same return.
 * A failed transition clears the last valid result instead of hiding failure.
 *
 * @param {{showResult(result: Readonly<{query: string, url: string}>): void, showError(message: string): void}} view
 * @returns {{prepare(rawQuery: unknown): Readonly<{query: string, url: string}>}}
 */
export function createSearchController(view) {
  return Object.freeze({
    prepare(rawQuery) {
      try {
        const result = createPinterestSearch(rawQuery);
        view.showResult(result);
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to prepare the search.';
        view.showError(message);
        throw error;
      }
    },
  });
}

/**
 * WebMCP tool contract — UUIDv5: 661d9508-75f2-518d-9618-ad0b65585518
 *
 * input {query} -> shared prepare operation -> output {query, url}.
 * The operation changes only this page's visible, ephemeral state. It does not
 * open Pinterest, fetch Pins, write remote data, or retain the query.
 *
 * @param {(rawQuery: unknown) => Readonly<{query: string, url: string}>} prepareSearch
 */
export function createWebMcpTool(prepareSearch) {
  return Object.freeze({
    name: WEBMCP_TOOL_NAME,
    title: 'Prepare Pinterest idea search',
    description:
      'Prepare a Pinterest search URL for an idea or visual concept and show the same result on the current page. This does not fetch Pins, open Pinterest, or save anything.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Idea or visual concept for Pinterest. Outer whitespace is removed; the shared contract then requires 1–200 Unicode code points.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: false,
      consequentialHint: false,
    },
    async execute(input) {
      return prepareSearch(input?.query);
    },
  });
}

/**
 * Register the page's one imperative WebMCP tool.
 *
 * State transitions: checking -> ready | unavailable | error; ready -> disposed.
 *
 * @param {{
 *   modelContext?: {registerTool(tool: object, options?: {signal?: AbortSignal}): void | Promise<void>},
 *   prepareSearch(rawQuery: unknown): Readonly<{query: string, url: string}>,
 *   onStatus?(status: {state: 'ready'|'unavailable'|'error', message: string}): void,
 * }} options
 */
export async function registerWebMcpTool({
  modelContext,
  prepareSearch,
  onStatus = () => {},
}) {
  const noop = () => {};

  if (!modelContext || typeof modelContext.registerTool !== 'function') {
    onStatus({
      state: 'unavailable',
      message: 'WebMCP is not available in this browser.',
    });
    return Object.freeze({ status: 'unavailable', dispose: noop });
  }

  const lifecycle = new AbortController();
  const tool = createWebMcpTool(prepareSearch);

  try {
    await Promise.resolve(
      modelContext.registerTool(tool, { signal: lifecycle.signal }),
    );
    onStatus({ state: 'ready', message: 'WebMCP tool ready.' });
    return Object.freeze({
      status: 'ready',
      tool,
      dispose: () => lifecycle.abort(),
    });
  } catch (error) {
    lifecycle.abort();
    onStatus({
      state: 'error',
      message: 'WebMCP tool registration failed.',
    });
    return Object.freeze({ status: 'error', error, dispose: noop });
  }
}

function requireElement(doc, id) {
  const element = doc.getElementById(id);
  if (!element) {
    throw new Error(`Required page element is missing: #${id}`);
  }
  return element;
}

/**
 * Wire the static page to the shared search controller and WebMCP adapter.
 *
 * UI state machine:
 * idle -> prepared -> prepared (replacement)
 * idle | prepared -> invalid (last valid result is cleared)
 * checking -> ready | unavailable | error
 *
 * @param {Document|{getElementById(id: string): any, modelContext?: any, defaultView?: any}} doc
 */
export async function mountApp(doc) {
  const form = requireElement(doc, 'search-form');
  const queryInput = requireElement(doc, 'query');
  const resultPanel = requireElement(doc, 'result-panel');
  const resultQuery = requireElement(doc, 'result-query');
  const searchLink = requireElement(doc, 'search-link');
  const errorOutput = requireElement(doc, 'error');
  const webMcpStatus = requireElement(doc, 'webmcp-status');

  const view = {
    showResult(result) {
      queryInput.value = result.query;
      queryInput.setAttribute('aria-invalid', 'false');
      errorOutput.textContent = '';
      errorOutput.hidden = true;
      resultQuery.textContent = result.query;
      searchLink.setAttribute('href', result.url);
      searchLink.hidden = false;
      resultPanel.hidden = false;
    },
    showError(message) {
      queryInput.setAttribute('aria-invalid', 'true');
      resultQuery.textContent = '';
      searchLink.removeAttribute('href');
      searchLink.hidden = true;
      resultPanel.hidden = true;
      errorOutput.textContent = message;
      errorOutput.hidden = false;
    },
  };

  const controller = createSearchController(view);
  const onSubmit = (event) => {
    event.preventDefault();
    try {
      controller.prepare(event.currentTarget?.dataset.query ?? queryInput.value);
    } catch {
      // The shared controller already rendered the actionable error.
    }
  };
  form.addEventListener('submit', onSubmit);
  const examples = doc.querySelectorAll?.('[data-query]') ?? [];
  for (const example of examples) example.addEventListener('click', onSubmit);

  const registration = await registerWebMcpTool({
    modelContext: doc.modelContext,
    prepareSearch: controller.prepare,
    onStatus(status) {
      webMcpStatus.textContent = status.message;
      webMcpStatus.dataset.state = status.state;
    },
  });

  const onPageHide = (event) => {
    // A page kept in the back-forward cache remains alive and must retain its tool.
    if (!event.persisted) {
      registration.dispose();
    }
  };
  doc.defaultView?.addEventListener('pagehide', onPageHide);

  return Object.freeze({
    controller,
    registration,
    dispose() {
      form.removeEventListener('submit', onSubmit);
      for (const example of examples) example.removeEventListener('click', onSubmit);
      doc.defaultView?.removeEventListener('pagehide', onPageHide);
      registration.dispose();
    },
  });
}

if (typeof document !== 'undefined') {
  void mountApp(document).catch((error) => {
    const message =
      error instanceof Error ? error.message : 'The demo could not start.';
    const status = document.getElementById('webmcp-status');
    if (status) {
      status.textContent = message;
      status.dataset.state = 'error';
    }
  });
}
