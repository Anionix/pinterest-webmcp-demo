import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CONTRACT_UUIDS_V5,
  PROJECT_UUID_V5,
  SOURCE_RECOVERY_EVENT_UUID_V7,
  UUID_V5_CANONICAL_NAMES,
  UUID_V5_DNS_NAMESPACE,
} from '../app.js';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V5 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ISO_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const [bundleIndex, contractDocument, updateLog, transitionText] =
  await Promise.all([
    readFile(new URL('../knowledge/index.md', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../knowledge/contracts/pinterest-idea-search.md',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(new URL('../knowledge/log.md', import.meta.url), 'utf8'),
    readFile(
      new URL('../knowledge/evidence/state-transitions.jsonl', import.meta.url),
      'utf8',
    ),
  ]);

function frontMatter(document, label) {
  const match = document.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert.ok(match, `${label} must begin with YAML front matter`);
  return match[1];
}

function scalar(frontMatterText, key) {
  const match = frontMatterText.match(
    new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'),
  );
  assert.ok(match, `front matter must include ${key}`);
  return match[1].replace(/^(['"])(.*)\1$/, '$2');
}

function tableCells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim().replace(/^`|`$/g, ''));
}

function markdownTables(document) {
  const lines = document.split(/\r?\n/);
  const tables = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index].trim().startsWith('|')) continue;
    const separator = tableCells(lines[index + 1]);
    if (!separator.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;

    const headers = tableCells(lines[index]);
    const rows = [];
    index += 2;
    while (index < lines.length && lines[index].trim().startsWith('|')) {
      rows.push(tableCells(lines[index]));
      index += 1;
    }
    tables.push({ headers, rows });
    index -= 1;
  }

  return tables;
}

function uuidBytes(uuid) {
  assert.match(uuid, UUID);
  return Buffer.from(uuid.replaceAll('-', ''), 'hex');
}

function formatUuid(bytes) {
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function deriveUuidV5(namespaceUuid, canonicalName) {
  const digest = createHash('sha1')
    .update(uuidBytes(namespaceUuid))
    .update(canonicalName, 'utf8')
    .digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

function parseTransitions(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  assert.ok(lines.length > 0, 'state-transition evidence must not be empty');
  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`invalid JSON on evidence line ${index + 1}`, {
        cause: error,
      });
    }
  });
}

const transitions = parseTransitions(transitionText);

test('knowledge bundle and contract expose Open Knowledge Format metadata', () => {
  const indexMetadata = frontMatter(bundleIndex, 'knowledge/index.md');
  const contractMetadata = frontMatter(
    contractDocument,
    'knowledge/contracts/pinterest-idea-search.md',
  );

  assert.equal(scalar(indexMetadata, 'okf_version'), '0.2');
  assert.equal(scalar(contractMetadata, 'type'), 'Interface Contract');
  assert.equal(scalar(contractMetadata, 'resource'), '../../app.js');
  assert.match(contractMetadata, /^sources:\s*$/m);

  const sourceBlocks = contractMetadata.split(/^  - id:\s*/m).slice(1);
  assert.ok(sourceBlocks.length > 0, 'contract must name at least one source');
  const sourceIds = [];
  const sourceUuids = [];
  for (const block of sourceBlocks) {
    const [sourceId] = block.split(/\r?\n/, 1);
    const sourceUuid = block.match(/^    source_uuid_v5:\s*(\S+)\s*$/m)?.[1];
    const resource = block.match(/^    resource:\s*(\S+)\s*$/m)?.[1];
    const author = block.match(/^    author:\s*(\S+)\s*$/m)?.[1];
    assert.ok(sourceId, 'source id must not be empty');
    assert.match(sourceUuid ?? '', UUID_V5, `${sourceId} source identity`);
    assert.ok(resource, `${sourceId} must name its source resource`);
    assert.ok(author, `${sourceId} must name its source author`);
    sourceIds.push(sourceId);
    sourceUuids.push(sourceUuid);
  }
  assert.equal(new Set(sourceIds).size, sourceIds.length);
  assert.equal(new Set(sourceUuids).size, sourceUuids.length);
});

test('documented UUID version 5 identities reproduce with standard SHA-1', () => {
  const derivationTable = markdownTables(contractDocument).find(
    ({ headers }) =>
      headers.join('|') ===
      'Namespace UUID|Canonical name|Derived UUID version 5',
  );
  assert.ok(derivationTable, 'contract must include the UUID derivation table');

  for (const [namespaceUuid, canonicalName, documentedUuid] of derivationTable.rows) {
    assert.match(namespaceUuid, UUID);
    assert.match(documentedUuid, UUID_V5);
    assert.equal(
      deriveUuidV5(namespaceUuid, canonicalName),
      documentedUuid,
      canonicalName,
    );
  }

  const expectedApplicationRows = [
    [
      UUID_V5_DNS_NAMESPACE,
      UUID_V5_CANONICAL_NAMES.project,
      PROJECT_UUID_V5,
    ],
    ...Object.entries(CONTRACT_UUIDS_V5).map(([key, uuid]) => [
      PROJECT_UUID_V5,
      UUID_V5_CANONICAL_NAMES[key],
      uuid,
    ]),
  ];
  assert.deepEqual(
    derivationTable.rows.slice(0, expectedApplicationRows.length),
    expectedApplicationRows,
  );

  const derivedUuids = derivationTable.rows.map((row) => row[2]);
  assert.equal(new Set(derivedUuids).size, derivedUuids.length);
  const knowledgeRecordUuid = scalar(
    frontMatter(contractDocument, 'contract'),
    'contract_uuid_v5',
  );
  assert.match(knowledgeRecordUuid, UUID_V5);
  assert.equal(derivedUuids.at(-1), knowledgeRecordUuid);
});

test('source and transition identities join to their derivation rows', () => {
  const derivationTable = markdownTables(contractDocument).find(
    ({ headers }) =>
      headers.join('|') ===
      'Namespace UUID|Canonical name|Derived UUID version 5',
  );
  assert.ok(derivationTable);
  const derivedByCanonicalName = new Map(
    derivationTable.rows.map(([, canonicalName, uuid]) => [canonicalName, uuid]),
  );
  const sourceCanonicalNames = {
    'product-brief': 'source/product-brief-share/v1',
    'webmcp-draft': 'source/webmcp-cg-draft/v1',
    'chrome-imperative-guide': 'source/chrome-webmcp-imperative/v1',
    'chatgpt-site-tools': 'source/chatgpt-site-tools/v1',
    'open-knowledge-format': 'source/open-knowledge-format-v0.2/v1',
  };
  const contractMetadata = frontMatter(contractDocument, 'contract');
  const sourceBlocks = contractMetadata.split(/^  - id:\s*/m).slice(1);

  for (const block of sourceBlocks) {
    const [sourceId] = block.split(/\r?\n/, 1);
    const sourceUuid = block.match(/^    source_uuid_v5:\s*(\S+)\s*$/m)?.[1];
    const canonicalName = sourceCanonicalNames[sourceId];
    assert.ok(canonicalName, `source ${sourceId} needs a canonical name`);
    assert.equal(sourceUuid, derivedByCanonicalName.get(canonicalName));
  }

  const documentedTransitionUuids = new Set(
    derivationTable.rows
      .filter(([, canonicalName]) => canonicalName.startsWith('transition/'))
      .map(([, , uuid]) => uuid),
  );
  for (const transition of transitions) {
    assert.ok(
      documentedTransitionUuids.has(transition.transition_uuid_v5),
      `transition ${transition.sequence} needs a derivation row`,
    );
  }
});

test('machine evidence is a continuous chronological chain of observations', () => {
  const requiredKeys = [
    'event_uuid_v7',
    'evidence',
    'from_state',
    'occurred_at',
    'sequence',
    'subject_uuid_v5',
    'to_state',
    'transition_uuid_v5',
  ];
  const eventIds = new Set();

  transitions.forEach((entry, index) => {
    assert.deepEqual(Object.keys(entry).sort(), requiredKeys);
    assert.equal(entry.sequence, index + 1);
    assert.match(entry.occurred_at, ISO_INSTANT);
    assert.match(entry.event_uuid_v7, UUID_V7);
    assert.match(entry.transition_uuid_v5, UUID_V5);
    assert.match(entry.subject_uuid_v5, UUID_V5);
    assert.equal(entry.subject_uuid_v5, PROJECT_UUID_V5);
    assert.ok(entry.from_state.length > 0);
    assert.ok(entry.to_state.length > 0);
    assert.ok(entry.evidence.length > 0);

    const occurredAt = Date.parse(entry.occurred_at);
    assert.equal(Number.isFinite(occurredAt), true);
    const uuidTimestamp = Number.parseInt(
      entry.event_uuid_v7.replaceAll('-', '').slice(0, 12),
      16,
    );
    assert.equal(uuidTimestamp, occurredAt, entry.event_uuid_v7);
    assert.equal(eventIds.has(entry.event_uuid_v7), false);
    eventIds.add(entry.event_uuid_v7);

    if (index > 0) {
      const previous = transitions[index - 1];
      assert.ok(Date.parse(entry.occurred_at) > Date.parse(previous.occurred_at));
      assert.equal(entry.from_state, previous.to_state);
    }
  });
});

test('the source-recovery UUID version 7 identifies one concrete observation', () => {
  const observation = transitions.find(
    (entry) => entry.event_uuid_v7 === SOURCE_RECOVERY_EVENT_UUID_V7,
  );
  assert.ok(observation, 'source-recovery observation must be recorded');
  assert.deepEqual(
    {
      sequence: observation.sequence,
      occurred_at: observation.occurred_at,
      subject_uuid_v5: observation.subject_uuid_v5,
      from_state: observation.from_state,
      to_state: observation.to_state,
    },
    {
      sequence: 2,
      occurred_at: '2026-09-04T08:51:56.438Z',
      subject_uuid_v5: PROJECT_UUID_V5,
      from_state: 'source_recovery_in_progress',
      to_state: 'local_source_restored',
    },
  );
});

test('human update log is date-grouped and newest first', () => {
  assert.doesNotMatch(updateLog, /^---\r?\n/);
  const headings = [...updateLog.matchAll(/^## (\d{4}-\d{2}-\d{2})\s*$/gm)];
  assert.ok(headings.length > 0, 'update log must contain date headings');
  const dates = headings.map((match) => match[1]);
  assert.deepEqual(dates, [...dates].sort().reverse());
  assert.equal(new Set(dates).size, dates.length);

  const loggedSequences = [];
  for (let index = 0; index < headings.length; index += 1) {
    const start = headings[index].index + headings[index][0].length;
    const end = headings[index + 1]?.index ?? updateLog.length;
    const section = updateLog.slice(start, end);
    const sequences = [...section.matchAll(/\bSequence (\d+)\b/g)].map(
      (match) => Number(match[1]),
    );
    assert.deepEqual(sequences, [...sequences].sort((left, right) => right - left));
    for (const sequence of sequences) {
      const observation = transitions.find((entry) => entry.sequence === sequence);
      assert.ok(observation, `log sequence ${sequence} must have machine evidence`);
      assert.equal(observation.occurred_at.slice(0, 10), headings[index][1]);
    }
    loggedSequences.push(...sequences);
  }

  assert.deepEqual(
    [...loggedSequences].sort((left, right) => left - right),
    transitions.map((entry) => entry.sequence),
  );
});
