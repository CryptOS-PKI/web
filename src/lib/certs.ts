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

import { getNode, mockNodes, type Node } from "@/lib/mock";

export type CertKind = "leaf" | "subordinate-ca";
export type CertStatus = "EXPIRED" | "REVOKED" | "VALID";
export type RevocationReason =
  "affiliationChanged" | "cessationOfOperation" | "keyCompromise" | "superseded" | "unspecified";

export interface Cert {
  eku: string[];
  issuedAt: string;
  issuerNodeName: string;
  kind: CertKind;
  notAfter: string;
  notBefore: string;
  pathLen?: number;
  reason?: RevocationReason;
  revokedAt?: string;
  sans: string[];
  serial: string;
  status: CertStatus;
  subjectCn: string;
  childNodeName?: string;
}

export interface IssueDraft {
  eku?: string[];
  kind: CertKind;
  pathLen?: number;
  sans?: string[];
  subjectCn: string;
  validityDays: number;
}

// Issuance capability: ESTABLISHED only; Root -> sub-CA, Intermediate -> both,
// Issuing -> leaf. Anything else issues nothing.
export const canIssue = (node: Node): CertKind[] => {
  if (node.identityState !== "ESTABLISHED") return [];
  if (node.role === "root") return ["subordinate-ca"];
  if (node.role === "intermediate") return ["subordinate-ca", "leaf"];
  return ["leaf"];
};

// Deterministic pseudo-serial so seeded fixtures are stable across reloads.
const hex = (seed: number): string => {
  let h = (seed * 2654435761) >>> 0;
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += (h & 0xf).toString(16);
    h >>>= 4;
  }
  return out.toUpperCase();
};

const daysFromNow = (days: number): string => {
  // A fixed epoch keeps fixtures stable and avoids Date.now() in module init.
  const base = Date.parse("2026-07-01T00:00:00Z");
  return new Date(base + days * 86_400_000).toISOString();
};

const seed = (): Cert[] => {
  const out: Cert[] = [];
  let n = 1;
  for (const node of mockNodes) {
    if (canIssue(node).length === 0 && node.identityState !== "REVOKED") continue;
    const count = node.role === "issuing" ? 3 : 2;
    for (let i = 0; i < count; i += 1) {
      const revoked = node.identityState === "REVOKED" || (node.role === "issuing" && i === 2);
      out.push({
        eku: ["serverAuth"],
        issuedAt: daysFromNow(-60 + i * 5),
        issuerNodeName: node.name,
        kind: "leaf",
        notAfter: daysFromNow(300 + i * 5),
        notBefore: daysFromNow(-60 + i * 5),
        sans: [`svc-${n}.acme.example`],
        serial: hex(n),
        status: revoked ? "REVOKED" : "VALID",
        subjectCn: `svc-${n}.acme.example`,
        ...(revoked ? { reason: "cessationOfOperation" as const, revokedAt: daysFromNow(-5) } : {}),
      });
      n += 1;
    }
  }
  return out;
};

let certs: Cert[] = seed();
const listeners = new Set<() => void>();
const emit = (): void => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// Cache the per-node slice so useSyncExternalStore's getSnapshot is referentially
// stable between emits (React bails out of re-render when the ref is unchanged).
let byNode: Map<string, Cert[]> = new Map();
const reindex = (): void => {
  byNode = new Map();
  for (const c of certs) {
    const arr = byNode.get(c.issuerNodeName) ?? [];
    arr.push(c);
    byNode.set(c.issuerNodeName, arr);
  }
};
reindex();

const EMPTY: Cert[] = [];
export const certsFor = (nodeName: string): Cert[] => byNode.get(nodeName) ?? EMPTY;
export const getCert = (serial: string): Cert | undefined => certs.find((c) => c.serial === serial);

export const useCerts = (nodeName: string): Cert[] =>
  useSyncExternalStore(
    subscribe,
    () => certsFor(nodeName),
    () => certsFor(nodeName),
  );

let nextSerial = 10_000;
export const issueCert = (issuerNodeName: string, draft: IssueDraft): Cert => {
  const cert: Cert = {
    eku: draft.eku ?? [],
    issuedAt: daysFromNow(0),
    issuerNodeName,
    kind: draft.kind,
    notAfter: daysFromNow(draft.validityDays),
    notBefore: daysFromNow(0),
    pathLen: draft.kind === "subordinate-ca" ? (draft.pathLen ?? 0) : undefined,
    sans: draft.sans ?? [],
    serial: hex(nextSerial++),
    status: "VALID",
    subjectCn: draft.subjectCn,
  };
  certs = [cert, ...certs];
  reindex();
  emit();
  return cert;
};

export const revokeCert = (serial: string, reason: RevocationReason): void => {
  certs = certs.map((c) =>
    c.serial === serial ? { ...c, reason, revokedAt: daysFromNow(0), status: "REVOKED" } : c,
  );
  reindex();
  emit();
};

// Test-only: restore the seeded fixtures between tests.
export const __resetCerts = (): void => {
  certs = seed();
  nextSerial = 10_000;
  reindex();
  emit();
};
