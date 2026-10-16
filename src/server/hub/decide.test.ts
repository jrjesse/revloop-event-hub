import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { mintPrincipal } from '../identity.ts';
import { decide } from './decide.ts';
import { hashEntry, openFileLedger, verifyChain, type LedgerEntry } from './ledger.ts';
import { emptyState, project } from './project.ts';
import type { EventRecord } from '../../types/index.ts';

const owner = { id: 'u1', name: 'Clara', email: 'clara@revloop.com.br', role: 'Head', department: 'Ops', avatar: '' };
const other = { id: 'u2', name: 'Jesse', email: 'jesse@revloop.com.br', role: 'Coord', department: 'Ops', avatar: '' };

function event(status: EventRecord['status']): EventRecord {
  return {
    id: 'evt-1',
    title: 'Jantar',
    type: 'jantar_clientes',
    targetAudience: 'Clientes',
    objective: 'Expandir',
    designatedOwnerName: owner.name,
    designatedOwnerEmail: owner.email,
    requestedByName: other.name,
    requestedByEmail: other.email,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    startDate: '2026-11-01T00:00:00.000Z',
    endDate: '2026-11-01T00:00:00.000Z',
    format: 'presencial',
    location: 'SP',
    budget: 1000,
    estimatedAttendees: 10,
    suppliers: [],
    status,
    health: 'atencao',
    policyComplianceScore: 0,
    milestones: [],
    tasks: [],
    policyChecklist: [],
    comments: [],
    resources: [],
    activities: [],
  };
}

function stateWith(status: EventRecord['status']) {
  const base = emptyState();
  const events = new Map(base.events);
  events.set('evt-1', event(status));
  return { ...base, events };
}

const directory = {
  provenance: 'seeded' as const,
  find: (email: string) => [owner, other].find(user => user.email === email) ?? null,
  list: () => [owner, other],
};

test('non-owner review is recorded and does not change status', () => {
  const decision = decide(stateWith('solicitado'), mintPrincipal(other, 's1'), {
    kind: 'review',
    eventId: 'evt-1',
    decision: { action: 'accept' },
  }, { now: new Date(), directory, templates: [], newId: prefix => prefix });
  assert.equal(decision.kind, 'denied_recorded');
  if (decision.kind !== 'denied_recorded') return;
  assert.equal(decision.facts[0].fact.kind, 'review_denied');
});

test('owner accept moves solicitado to aprovado', () => {
  const decision = decide(stateWith('solicitado'), mintPrincipal(owner, 's1'), {
    kind: 'review',
    eventId: 'evt-1',
    decision: { action: 'accept' },
  }, { now: new Date(), directory, templates: [], newId: prefix => prefix });
  assert.equal(decision.kind, 'accepted');
  if (decision.kind !== 'accepted') return;
  assert.equal(decision.facts[0].fact.kind, 'review_recorded');
  if (decision.facts[0].fact.kind !== 'review_recorded') return;
  assert.equal(decision.facts[0].fact.to, 'aprovado');
});

test('repeating accept on an approved event writes nothing', () => {
  const decision = decide(stateWith('aprovado'), mintPrincipal(owner, 's1'), {
    kind: 'review',
    eventId: 'evt-1',
    decision: { action: 'accept' },
  }, { now: new Date(), directory, templates: [], newId: prefix => prefix });
  assert.equal(decision.kind, 'accepted');
  if (decision.kind !== 'accepted') return;
  assert.equal(decision.facts.length, 0);
});

test('accepting a rejected event is a conflict', () => {
  const decision = decide(stateWith('rejeitado'), mintPrincipal(owner, 's1'), {
    kind: 'review',
    eventId: 'evt-1',
    decision: { action: 'accept' },
  }, { now: new Date(), directory, templates: [], newId: prefix => prefix });
  assert.equal(decision.kind, 'refused');
  if (decision.kind !== 'refused') return;
  assert.equal(decision.reason, 'invalid_transition');
});

test('a broken hash fails verification and a file rename keeps the chain', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-ledger-'));
  const file = path.join(dir, 'ledger.json');
  const store = openFileLedger(file);
  const body = {
    seq: 0,
    at: '2026-10-01T00:00:00.000Z',
    actor: { kind: 'system' as const, reason: 'seed' as const },
    commandId: null,
    eventId: 'evt-1',
    fact: { kind: 'review_denied' as const, decision: 'accept' as const, ownerEmail: owner.email, currentStatus: 'solicitado' as const },
    group: { size: 1, index: 0 },
    prevHash: 'genesis',
  };
  const entry = { ...body, hash: hashEntry(body) };
  await store.create({ catalog: { users: [], templates: [], playbooks: [] }, entries: [entry] });
  const loaded = await store.load();
  assert.equal(verifyChain(loaded!.entries).ok, true);
  const tampered: LedgerEntry = { ...loaded!.entries[0], hash: '0'.repeat(64) };
  fs.writeFileSync(file, JSON.stringify({ catalog: loaded!.catalog, entries: [tampered] }));
  await assert.rejects(() => store.load());
  const projected = project(emptyState(), entry);
  assert.equal(projected.head.hash, entry.hash);
});
