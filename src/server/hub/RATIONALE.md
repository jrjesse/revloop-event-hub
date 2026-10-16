## Problem

The hub already let anyone submit and only the designated owner accept, but the server trusted a client header and fell back to the first user. Approval status could also be written by `updateEvent`. Duplicate and template skipped the creation audit. The file named D1 was overwritten in place, and the audit hash was decorative.

## Usage (caller's view)

Boot calls `openHub` then `createIdentity`. A review is `identity.guard` plus `hub.dispatch(principal, reviewCommand, commandId)`. Intake, duplicate, and template are one `create_event` command distinguished by `origin`. The browser signs in with `POST /api/session/dev` and then sends only the HttpOnly cookie.

## Shape

The ledger is the only write. `decide` is pure and holds the owner check, the status machine, and the same-state no-op for accept and reject. `project` derives score, health, activities, and the audit rows. `IdentityMode`, `LedgerKind`, and `Provenance` each have one member until a real adapter exists. Writes use a temp file, fsync, and rename.

## Synthesis decision

Candidate A is the base: one `dispatch`, one create command, append-only entries, server-issued cookie. The cross-judge scored it 27/30 against B's 22/30. Grafted from B: reject requires a reason in the type; an accept or reject that repeats the current status returns success and writes nothing; a contradictory decision returns 409; legacy rows become typed `legacy_audit` facts instead of an untyped blob. Rejected from B: three create routes, a bearer token in localStorage, and a `workspace_issuer` name with no adapter. Rejected from A: the claim that a review crosses only three files. The trace is route, identity, hub, then `decide`. `OpenHubOptions` carries the directory through the loaded catalog.

## Tradeoffs accepted

- We accept a full-file rewrite per command in exchange for a rename that cannot tear the ledger.
- We accept event-sourcing names in exchange for one writer.
- We accept a local roster session in exchange for booting without an OAuth secret. Production refuses that mode unless `HUB_ALLOW_LOCAL_DEV=true`.
- We accept dropping the fixed per-event hour table in exchange for hours computed from audit timestamps.

## Alternatives considered

A mutable `EventRecord` store with each method remembering to audit loses, because the next method can skip the audit. Publishing the fact log to routes loses, because a status fact becomes a second approval writer.

## Open questions and risks

- Should `em_planejamento`, `concluido`, and `cancelado` gain owner commands, or stay as imported status only?
- Should a denied attempt stay visible on the event trail for every member?

## Next implementation step

This file records the step that was implemented: `decide` for review, the file ledger, and `POST /api/events/:id/review` on `hub.dispatch`.
