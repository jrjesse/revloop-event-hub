import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { EventTemplate, PlaybookGuide, WorkspaceUser } from '../../types/index.ts';
import type { CommandId, HubFact, IdentityMode } from './types.ts';

export interface Catalog {
  users: WorkspaceUser[];
  templates: EventTemplate[];
  playbooks: PlaybookGuide[];
}

export type ActorStamp =
  | { kind: 'principal'; user: WorkspaceUser; issuedBy: IdentityMode; sessionId: string }
  | { kind: 'system'; reason: 'seed' | 'legacy_import' };

export interface LedgerEntry {
  seq: number;
  at: string;
  actor: ActorStamp;
  commandId: CommandId | null;
  eventId: string;
  fact: HubFact;
  group: { size: number; index: number };
  prevHash: string;
  hash: string;
}

export interface LedgerDocument {
  catalog: Catalog;
  entries: LedgerEntry[];
}

export type AppendResult = { ok: true; head: number } | { ok: false; reason: 'head_moved'; head: number };

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter(key => obj[key] !== undefined)
    .sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`).join(',')}}`;
}

export function hashEntry(entry: Omit<LedgerEntry, 'hash'>): string {
  return createHash('sha256').update(canonicalJson(entry)).digest('hex');
}

export function verifyChain(entries: readonly LedgerEntry[]): { ok: true; head: string } | { ok: false; brokenAtSeq: number } {
  let prev = 'genesis';
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.seq !== i || entry.prevHash !== prev) return { ok: false, brokenAtSeq: i };
    const { hash, ...rest } = entry;
    if (hash !== hashEntry(rest)) return { ok: false, brokenAtSeq: i };
    prev = hash;
  }
  return { ok: true, head: entries.length ? prev : 'genesis' };
}

export function sealEntry(entry: Omit<LedgerEntry, 'hash'>): LedgerEntry {
  return { ...entry, hash: hashEntry(entry) };
}

function atomicWrite(target: string, body: string): void {
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `${path.basename(target)}.tmp-${process.pid}-${Date.now()}`);
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, body);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, target);
  const dirFd = fs.openSync(dir, 'r');
  try {
    fs.fsyncSync(dirFd);
  } finally {
    fs.closeSync(dirFd);
  }
}

export interface LedgerStore {
  readonly description: { kind: 'local_file'; label: 'Ledger local (arquivo JSON)' };
  load(): Promise<LedgerDocument | null>;
  create(document: LedgerDocument): Promise<void>;
  append(expectedHead: number, entries: LedgerEntry[]): Promise<AppendResult>;
}

export function openFileLedger(filePath: string): LedgerStore {
  const description = { kind: 'local_file' as const, label: 'Ledger local (arquivo JSON)' as const };

  function read(): LedgerDocument | null {
    if (!fs.existsSync(filePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as LedgerDocument;
    if (!parsed || !Array.isArray(parsed.entries) || !parsed.catalog) {
      throw new Error(`Ledger ilegível em ${filePath}. O processo não regrava por cima de um arquivo corrompido.`);
    }
    const check = verifyChain(parsed.entries);
    if (!check.ok) {
      throw new Error(`Cadeia do ledger quebrada no seq ${check.brokenAtSeq}. O processo não reinicia o arquivo.`);
    }
    return parsed;
  }

  return {
    description,
    async load() {
      return read();
    },
    async create(document) {
      if (fs.existsSync(filePath)) {
        throw new Error(`Ledger já existe em ${filePath}.`);
      }
      const check = verifyChain(document.entries);
      if (!check.ok) throw new Error(`Cadeia inicial inválida no seq ${check.brokenAtSeq}.`);
      atomicWrite(filePath, JSON.stringify(document, null, 2));
    },
    async append(expectedHead, entries) {
      const current = read();
      if (!current) return { ok: false, reason: 'head_moved', head: -1 };
      const head = current.entries.length ? current.entries[current.entries.length - 1].seq : -1;
      if (head !== expectedHead) return { ok: false, reason: 'head_moved', head };
      if (entries.length === 0) return { ok: true, head };
      const next = [...current.entries, ...entries];
      const check = verifyChain(next);
      if (!check.ok) throw new Error(`Append quebrou a cadeia no seq ${check.brokenAtSeq}.`);
      atomicWrite(filePath, JSON.stringify({ catalog: current.catalog, entries: next }, null, 2));
      return { ok: true, head: next[next.length - 1].seq };
    },
  };
}
