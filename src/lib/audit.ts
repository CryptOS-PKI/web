/*
Apache License 2.0

Copyright 2026 Shane

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { useSyncExternalStore } from "react";

// Leaf store: imports NO domain store (domain stores import recordAudit from
// here). Own fixed clock keeps events deterministic without Date.now().
export interface AuditEvent {
  at: string;
  id: string;
  kind: AuditKind;
  summary: string;
  targetKind?: "cert" | "enrollment" | "node" | "profile" | "protocol";
  targetPath?: string;
}

export type AuditKind =
  | "config-applied"
  | "enroll-approved"
  | "enroll-rejected"
  | "issued"
  | "profile-created"
  | "profile-updated"
  | "protocol-toggled"
  | "rekeyed"
  | "renewed"
  | "revoked";

const AUDIT_EPOCH_MS = Date.parse("2026-07-01T00:00:00Z");
const daysFromNow = (days: number): string =>
  new Date(AUDIT_EPOCH_MS + days * 86_400_000).toISOString();

const seed = (): AuditEvent[] => [
  {
    at: daysFromNow(-1),
    id: "aud-0009",
    kind: "revoked",
    summary: "Revoked svc-9.acme.example (keyCompromise)",
    targetKind: "cert",
  },
  {
    at: daysFromNow(-2),
    id: "aud-0008",
    kind: "enroll-approved",
    summary: "Approved enrollment acme-issuing-04 under ACME Intermediate CA G1",
    targetKind: "node",
    targetPath: "/nodes/acme-issuing-04",
  },
  {
    at: daysFromNow(-3),
    id: "aud-0007",
    kind: "protocol-toggled",
    summary: "Enabled ACME (RFC 8555)",
    targetKind: "protocol",
    targetPath: "/protocols/acme",
  },
  {
    at: daysFromNow(-4),
    id: "aud-0006",
    kind: "config-applied",
    summary: "Config applied to acme-issuing-01",
    targetKind: "node",
    targetPath: "/nodes/acme-issuing-01",
  },
  {
    at: daysFromNow(-5),
    id: "aud-0005",
    kind: "rekeyed",
    summary: "Re-key ceremony completed for acme-root-01",
    targetKind: "node",
    targetPath: "/root/acme-root-01",
  },
  {
    at: daysFromNow(-6),
    id: "aud-0004",
    kind: "renewed",
    summary: "Renewed ldap-a.acme.example",
    targetKind: "cert",
  },
  {
    at: daysFromNow(-7),
    id: "aud-0003",
    kind: "profile-updated",
    summary: "Updated profile Code Signing",
    targetKind: "profile",
    targetPath: "/profiles/Code Signing",
  },
  {
    at: daysFromNow(-8),
    id: "aud-0002",
    kind: "enroll-rejected",
    summary: "Rejected enrollment acme-issuing-h03 (failed attestation)",
    targetKind: "enrollment",
  },
  {
    at: daysFromNow(-9),
    id: "aud-0001",
    kind: "profile-created",
    summary: "Created profile TLS Server (LDAPS)",
    targetKind: "profile",
    targetPath: "/profiles/TLS Server (LDAPS)",
  },
  {
    at: daysFromNow(-10),
    id: "aud-0000",
    kind: "issued",
    summary: "Issued leaf svc-1.acme.example on acme-issuing-01",
    targetKind: "cert",
  },
];

let events: AuditEvent[] = seed();
const listeners = new Set<() => void>();
const emit = (): void => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const auditList = (): AuditEvent[] => events;
export const useAudit = (): AuditEvent[] =>
  useSyncExternalStore(
    subscribe,
    () => events,
    () => events,
  );

let nextId = 1000;
export const recordAudit = (e: Omit<AuditEvent, "at" | "id">): void => {
  events = [{ ...e, at: daysFromNow(0), id: `aud-${nextId++}` }, ...events];
  emit();
};

// Test-only.
export const __resetAudit = (): void => {
  events = seed();
  nextId = 1000;
  emit();
};
