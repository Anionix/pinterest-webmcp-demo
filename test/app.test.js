import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CONTRACT_UUIDS_V5,
  MAX_QUERY_CODE_POINTS,
  PINTEREST_SEARCH_ORIGIN,
  PROJECT_UUID_V5,
  WEBMCP_TOOL_NAME,
  createPinterestSearch,
  createSearchController,
  createWebMcpTool,
  mountApp,
  registerWebMcpTool,
} from '../app.js';

const REQUIRED_ELEMENT_IDS = [
  'search-form',
  'query',
  'result-panel',
  'result-query',
  'search-link',
  'error',
  'webmcp-status',
];

class FakeEventTarget {
  #listeners = new Map();

  addEventListener(type, listener, options = {}) {
    const listeners = this.#listeners.get(type) ?? [];
    listeners.push({ listener, once: Boolean(options?.once) });
    this.#listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.#listeners.get(type) ?? [];
    this.#listeners.set(
      type,
      listeners.filter((entry) => entry.listener !== listener),
    );
  }

  dispatch(type, overrides = {}) {
    const event = {
      type,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...overrides,
    };

    for (const entry of [...(this.#listeners.get(type) ?? [])]) {
      if (entry.once) {
        this.removeEventListener(type, entry.listener);
      }
      entry.listener.call(this, event);
    }

    return event;
  }

  listenerCount(type) {
    return (this.#listeners.get(type) ?? []).length;
  }
}

class FakeElement extends FakeEventTarget {
  constructor() {
    super();
    this.textContent = '';
    this.hidden = false;
    this.value = '';
    this.dataset = {};
    this.attributes = new Map();
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

function createFakeDocument(modelContext) {
  const elements = new Map(
    REQUIRED_ELEMENT_IDS.map((id) => [id, new FakeElement()]),
  );
  elements.get('result-panel').hidden = true;
  elements.get('search-link').hidden = true;
  elements.get('error').hidden = true;
  elements.get('webmcp-status').dataset.state = 'checking';

  const defaultView = new FakeEventTarget();
  const doc = {
    modelContext,
    defaultView,
    getElementById(id) {
      return elements.get(id) ?? null;
    },
  };

  return { doc, elements, defaultView };
}

function visibleResultSnapshot(elements) {
  return {
    input: elements.get('query').value,
    inputInvalid: elements.get('query').getAttribute('aria-invalid'),
    query: elements.get('result-query').textContent,
    href: elements.get('search-link').getAttribute('href'),
    linkHidden: elements.get('search-link').hidden,
    panelHidden: elements.get('result-panel').hidden,
    error: elements.get('error').textContent,
    errorHidden: elements.get('error').hidden,
  };
}

test('stable identities are valid UUIDv5 values', () => {
  const uuidV5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert.match(PROJECT_UUID_V5, uuidV5);
  for (const id of Object.values(CONTRACT_UUIDS_V5)) {
    assert.match(id, uuidV5);
  }
});

test('createPinterestSearch rejects non-string values', () => {
  for (const value of [undefined, null, 7, {}, []]) {
    assert.throws(() => createPinterestSearch(value), TypeError);
  }
});

test('createPinterestSearch rejects empty and whitespace-only strings', () => {
  for (const value of ['', '   ', '\n\t']) {
    assert.throws(() => createPinterestSearch(value), RangeError);
  }
});

test('createPinterestSearch trims only outer whitespace', () => {
  const result = createPinterestSearch('  prism   lighting  ');
  assert.equal(result.query, 'prism   lighting');
  assert.equal(new URL(result.url).searchParams.get('q'), 'prism   lighting');
});

test('createPinterestSearch keeps the Pinterest boundary fixed', () => {
  const query = '水中 bride & prism #? https://evil.example/a';
  const result = createPinterestSearch(query);
  const url = new URL(result.url);

  assert.equal(url.origin, PINTEREST_SEARCH_ORIGIN);
  assert.equal(url.pathname, '/search/pins/');
  assert.equal(url.hash, '');
  assert.deepEqual([...url.searchParams.keys()], ['q']);
  assert.equal(url.searchParams.get('q'), query);
});

test('createPinterestSearch counts Unicode code points at the 200 boundary', () => {
  const accepted = '😀'.repeat(MAX_QUERY_CODE_POINTS);
  assert.equal(accepted.length, MAX_QUERY_CODE_POINTS * 2);
  assert.equal(createPinterestSearch(accepted).query, accepted);
  assert.throws(
    () => createPinterestSearch(`${accepted}😀`),
    /200 Unicode characters or fewer/,
  );
});

test('createPinterestSearch returns an immutable result', () => {
  const result = createPinterestSearch('cat');
  assert.deepEqual(result, {
    query: 'cat',
    url: 'https://www.pinterest.com/search/pins/?q=cat',
  });
  assert.equal(Object.isFrozen(result), true);
});

test('controller exposes result, error, and recovery transitions', () => {
  const events = [];
  const controller = createSearchController({
    showResult(result) {
      events.push({ type: 'result', result });
    },
    showError(message) {
      events.push({ type: 'error', message });
    },
  });

  const first = controller.prepare('  cat  ');
  assert.deepEqual(events.at(-1), { type: 'result', result: first });
  assert.throws(() => controller.prepare('   '), RangeError);
  assert.deepEqual(events.at(-1), {
    type: 'error',
    message: 'Enter an idea to search.',
  });
  const recovered = controller.prepare('prism');
  assert.deepEqual(events.at(-1), { type: 'result', result: recovered });
});

test('WebMCP tool descriptor states the exact capability and risk hints', () => {
  const tool = createWebMcpTool(() => ({}));

  assert.equal(tool.name, WEBMCP_TOOL_NAME);
  assert.equal(tool.inputSchema.type, 'object');
  assert.deepEqual(tool.inputSchema.required, ['query']);
  assert.equal(tool.inputSchema.additionalProperties, false);
  assert.deepEqual(tool.inputSchema.properties.query, {
    type: 'string',
    description:
      'Idea or visual concept for Pinterest. Outer whitespace is removed; the shared contract then requires 1–200 Unicode code points.',
  });
  assert.deepEqual(tool.annotations, {
    readOnlyHint: false,
    untrustedContentHint: false,
    consequentialHint: false,
  });
  assert.equal(Object.isFrozen(tool), true);
});

test('WebMCP tool delegates the raw query and returns the result unchanged', async () => {
  const calls = [];
  const expected = Object.freeze({ query: 'cat', url: 'https://example.test' });
  const tool = createWebMcpTool((query) => {
    calls.push(query);
    return expected;
  });

  assert.equal(await tool.execute({ query: '  cat  ' }), expected);
  assert.deepEqual(calls, ['  cat  ']);
});

test('unsupported WebMCP reports unavailable without breaking the page', async () => {
  const statuses = [];
  const registration = await registerWebMcpTool({
    prepareSearch: createPinterestSearch,
    onStatus: (status) => statuses.push(status),
  });

  assert.equal(registration.status, 'unavailable');
  assert.deepEqual(statuses, [
    {
      state: 'unavailable',
      message: 'WebMCP is not available in this browser.',
    },
  ]);
  assert.doesNotThrow(() => registration.dispose());
});

test('supported WebMCP registers once and aborts its registration on dispose', async () => {
  const calls = [];
  const statuses = [];
  const modelContext = {
    registerTool(tool, options) {
      calls.push({ tool, options });
    },
  };

  const registration = await registerWebMcpTool({
    modelContext,
    prepareSearch: createPinterestSearch,
    onStatus: (status) => statuses.push(status),
  });

  assert.equal(registration.status, 'ready');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].tool, registration.tool);
  assert.equal(calls[0].options.signal.aborted, false);
  assert.deepEqual(statuses, [{ state: 'ready', message: 'WebMCP tool ready.' }]);
  registration.dispose();
  assert.equal(calls[0].options.signal.aborted, true);
});

for (const [label, failRegistration] of [
  [
    'synchronous',
    () => {
      throw new Error('sync failure');
    },
  ],
  [
    'asynchronous',
    () => Promise.reject(new Error('async failure')),
  ],
]) {
  test(`${label} registration failure is visible and preserves its cause`, async () => {
    const statuses = [];
    let signal;
    const registerTool = (_tool, options) => {
      signal = options.signal;
      return failRegistration();
    };
    const registration = await registerWebMcpTool({
      modelContext: { registerTool },
      prepareSearch: createPinterestSearch,
      onStatus: (status) => statuses.push(status),
    });

    assert.equal(registration.status, 'error');
    assert.match(registration.error.message, /failure/);
    assert.equal(signal.aborted, true);
    assert.deepEqual(statuses, [
      { state: 'error', message: 'WebMCP tool registration failed.' },
    ]);
  });
}

test('manual form path works without WebMCP and recovers from invalid input', async () => {
  const { doc, elements } = createFakeDocument();
  const app = await mountApp(doc);
  const form = elements.get('search-form');
  const input = elements.get('query');

  input.value = '  water & light  ';
  const event = form.dispatch('submit');
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(visibleResultSnapshot(elements), {
    input: 'water & light',
    inputInvalid: 'false',
    query: 'water & light',
    href: 'https://www.pinterest.com/search/pins/?q=water+%26+light',
    linkHidden: false,
    panelHidden: false,
    error: '',
    errorHidden: true,
  });

  input.value = '   ';
  form.dispatch('submit');
  assert.deepEqual(visibleResultSnapshot(elements), {
    input: '   ',
    inputInvalid: 'true',
    query: '',
    href: null,
    linkHidden: true,
    panelHidden: true,
    error: 'Enter an idea to search.',
    errorHidden: false,
  });

  input.value = 'recovered';
  form.dispatch('submit');
  assert.equal(elements.get('result-query').textContent, 'recovered');
  assert.equal(elements.get('error').hidden, true);
  app.dispose();
});

test('human and WebMCP paths produce the same return and visible state', async () => {
  let registeredTool;
  const modelContext = {
    registerTool(tool) {
      registeredTool = tool;
    },
  };
  const { doc, elements } = createFakeDocument(modelContext);
  const app = await mountApp(doc);
  const rawQuery = '  水中 bride & prism  ';

  elements.get('query').value = rawQuery;
  elements.get('search-form').dispatch('submit');
  const humanState = visibleResultSnapshot(elements);

  elements.get('query').value = ' ';
  elements.get('search-form').dispatch('submit');
  const agentResult = await registeredTool.execute({ query: rawQuery });
  const agentState = visibleResultSnapshot(elements);

  assert.deepEqual(agentResult, {
    query: humanState.query,
    url: humanState.href,
  });
  assert.deepEqual(agentState, humanState);
  app.dispose();
});

test('schema and core share one validation path after outer whitespace', async () => {
  const rawQuery = `${' '.repeat(201)}cat${' '.repeat(201)}`;
  const tool = createWebMcpTool(createPinterestSearch);
  const result = await tool.execute({ query: rawQuery });

  assert.deepEqual(result, {
    query: 'cat',
    url: 'https://www.pinterest.com/search/pins/?q=cat',
  });
  assert.equal('maxLength' in tool.inputSchema.properties.query, false);
});

test('registration failure leaves the manual form operational', async () => {
  const modelContext = {
    registerTool() {
      throw new Error('unsupported implementation');
    },
  };
  const { doc, elements } = createFakeDocument(modelContext);
  const app = await mountApp(doc);

  assert.equal(elements.get('webmcp-status').dataset.state, 'error');
  elements.get('query').value = 'cat';
  elements.get('search-form').dispatch('submit');
  assert.equal(elements.get('result-panel').hidden, false);
  app.dispose();
});

test('dispose removes listeners and unregisters the WebMCP tool', async () => {
  let signal;
  const modelContext = {
    registerTool(_tool, options) {
      signal = options.signal;
    },
  };
  const { doc, elements, defaultView } = createFakeDocument(modelContext);
  const app = await mountApp(doc);
  const form = elements.get('search-form');

  assert.equal(form.listenerCount('submit'), 1);
  assert.equal(defaultView.listenerCount('pagehide'), 1);
  app.dispose();
  app.dispose();
  assert.equal(form.listenerCount('submit'), 0);
  assert.equal(defaultView.listenerCount('pagehide'), 0);
  assert.equal(signal.aborted, true);

  elements.get('query').value = 'should not run';
  form.dispatch('submit');
  assert.equal(elements.get('result-panel').hidden, true);
});

test('pagehide retains the tool for back-forward cache and disposes otherwise', async () => {
  let signal;
  const modelContext = {
    registerTool(_tool, options) {
      signal = options.signal;
    },
  };
  const { doc, defaultView } = createFakeDocument(modelContext);
  const app = await mountApp(doc);

  defaultView.dispatch('pagehide', { persisted: true });
  assert.equal(signal.aborted, false);
  assert.equal(defaultView.listenerCount('pagehide'), 1);

  defaultView.dispatch('pagehide', { persisted: false });
  assert.equal(signal.aborted, true);
  app.dispose();
  assert.equal(defaultView.listenerCount('pagehide'), 0);
});

test('mountApp names a missing required element', async () => {
  const { doc, elements } = createFakeDocument();
  elements.delete('query');
  await assert.rejects(() => mountApp(doc), /Required page element is missing: #query/);
});

test('static security contract forbids hidden I/O, persistence, and navigation', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const forbidden = [
    /\.innerHTML\s*=/,
    /\.insertAdjacentHTML\s*\(/,
    /\bdocument\.write\s*\(/,
    /\beval\s*\(/,
    /\bnew\s+Function\b/,
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\bEventSource\b/,
    /\.sendBeacon\s*\(/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bindexedDB\b/,
    /\.cookie\s*=/,
    /\bcaches\.open\s*\(/,
    /\.serviceWorker\.register\s*\(/,
    /\bwindow\.open\s*\(/,
    /\blocation\.(?:assign|replace)\s*\(/,
    /\blocation\s*=/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern);
  }
});

test('runtime has one local script and no package dependency', async () => {
  const [html, source, packageText] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ]);
  const packageData = JSON.parse(packageText);
  const scriptSources = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(
    (match) => match[1],
  );

  assert.deepEqual(scriptSources, ['./app.js']);
  assert.doesNotMatch(html, /<link[^>]+rel="stylesheet"/i);
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.deepEqual(packageData.dependencies ?? {}, {});
  assert.deepEqual(packageData.devDependencies ?? {}, {});
});

test('static page fails closed before application code starts', async () => {
  const [html, vercelText] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
  ]);
  const queryInput = html.match(/<input[\s\S]*?id="query"[\s\S]*?>/i)?.[0];
  assert.ok(queryInput, 'query input must exist');
  assert.doesNotMatch(queryInput, /\bname\s*=/i);
  assert.doesNotMatch(html, /<form[^>]+\baction\s*=/i);
  assert.doesNotMatch(html, /<(?:iframe|object|embed)\b/i);
  assert.doesNotMatch(html, /<(?:img|script|link)[^>]+(?:src|href)="https?:/i);
  assert.match(
    html,
    /<a[\s\S]*?id="search-link"[\s\S]*?target="_blank"[\s\S]*?rel="noopener noreferrer"/i,
  );

  const vercel = JSON.parse(vercelText);
  const headers = vercel.headers.flatMap((route) => route.headers ?? []);
  const contentSecurityPolicy = headers.find(
    (header) => header.key.toLowerCase() === 'content-security-policy',
  );
  assert.ok(contentSecurityPolicy, 'production must send a content security policy');
  assert.match(contentSecurityPolicy.value, /(?:^|;)\s*form-action 'none'(?:;|$)/);
  assert.match(contentSecurityPolicy.value, /(?:^|;)\s*frame-ancestors 'none'(?:;|$)/);
});
