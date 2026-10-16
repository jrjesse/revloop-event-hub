import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import type { WorkspaceUser } from '../types/index.ts';
import type { IdentityMode } from './hub/types.ts';

declare const principalBrand: unique symbol;

/** Server-minted identity. Routes obtain one only through `guard`. */
export type Principal = {
  readonly [principalBrand]: true;
  readonly user: Readonly<WorkspaceUser>;
  readonly issuedBy: IdentityMode;
  readonly sessionId: string;
};

export interface WorkspaceDirectory {
  readonly provenance: 'seeded';
  find(email: string): WorkspaceUser | null;
  list(): readonly WorkspaceUser[];
}

export function directoryFrom(users: readonly WorkspaceUser[]): WorkspaceDirectory {
  return {
    provenance: 'seeded',
    find(email: string) {
      const needle = email.trim().toLowerCase();
      return users.find(user => user.email.toLowerCase() === needle) ?? null;
    },
    list() {
      return users;
    },
  };
}

export function mintPrincipal(user: WorkspaceUser, sessionId: string): Principal {
  return { user, issuedBy: 'local_dev', sessionId } as Principal;
}

export interface SessionInfo {
  user: WorkspaceUser;
  identityMode: IdentityMode;
  devSignInChoices?: WorkspaceUser[];
}

export interface Identity {
  readonly mode: IdentityMode;
  readonly directory: WorkspaceDirectory;
  guard(handler: (principal: Principal, req: Request, res: Response) => unknown): (req: Request, res: Response) => Promise<void>;
  session(principal: Principal): SessionInfo;
  router(): Router;
}

const COOKIE = 'revloop_session';

function readCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

function loadSecret(secretPath: string): Buffer {
  if (fs.existsSync(secretPath)) return fs.readFileSync(secretPath);
  const secret = randomBytes(32);
  const dir = path.dirname(secretPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `${path.basename(secretPath)}.tmp-${process.pid}`);
  fs.writeFileSync(tmp, secret);
  fs.renameSync(tmp, secretPath);
  return secret;
}

function sign(body: string, secret: Buffer): string {
  const mac = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function verify(token: string, secret: Buffer): string | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return body;
}

export function createIdentity(options: {
  mode: IdentityMode;
  directory: WorkspaceDirectory;
  secretPath: string;
  allowInProduction: boolean;
}): Identity {
  if (process.env.NODE_ENV === 'production' && !options.allowInProduction) {
    throw new Error('Identidade local_dev não sobe em produção sem HUB_ALLOW_LOCAL_DEV=true.');
  }
  const secret = loadSecret(options.secretPath);

  function principalFromToken(token: string | undefined): Principal | null {
    if (!token) return null;
    const body = verify(token, secret);
    if (!body) return null;
    const [sessionId, email] = body.split('|');
    if (!sessionId || !email) return null;
    const user = options.directory.find(email);
    if (!user) return null;
    return mintPrincipal(user, sessionId);
  }

  return {
    mode: options.mode,
    directory: options.directory,
    session(principal) {
      return {
        user: principal.user,
        identityMode: principal.issuedBy,
        devSignInChoices: [...options.directory.list()],
      };
    },
    guard(handler) {
      return async (req, res) => {
        const principal = principalFromToken(readCookie(req));
        if (!principal) {
          res.status(401).json({ success: false, error: 'Sessão ausente ou inválida.' });
          return;
        }
        await handler(principal, req, res);
      };
    },
    router() {
      const router = createRouter();
      router.post('/session/dev', (req, res) => {
        const email = typeof req.body?.email === 'string' ? req.body.email : '';
        const user = options.directory.find(email);
        if (!user) {
          res.status(401).json({ success: false, error: 'E-mail fora do workspace.' });
          return;
        }
        const token = sign(`${randomBytes(8).toString('hex')}|${user.email.toLowerCase()}`, secret);
        res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/`);
        res.json({ success: true, user, identityMode: options.mode });
      });
      router.delete('/session', (_req, res) => {
        res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
        res.json({ success: true });
      });
      return router;
    },
  };
}
