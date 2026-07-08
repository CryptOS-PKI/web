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

import { recordAudit } from "@/lib/audit";
import { canIssue, type CertKind } from "@/lib/certs";
import { type Node, type NodeRole } from "@/lib/mock";
import { addNode, getNodeByCn } from "@/lib/nodes";

export interface Attestation {
  nodeId: string;
  tpm: string;
}

export interface Csr {
  keyType: string;
  subjectCn: string;
}
export interface EnrollmentDraft {
  address: string;
  attestation: Attestation;
  csr: Csr;
  parentCn: string;
  proposedName: string;
  role: NodeRole;
}
export interface EnrollmentRequest {
  address: string;
  admittedNodeName?: string;
  attestation: Attestation;
  csr: Csr;
  id: string;
  parentCn: string;
  proposedName: string;
  rejectionReason?: string;
  requestedAt: string;
  role: NodeRole;
  status: EnrollmentStatus;
}
export type EnrollmentStatus = "APPROVED" | "PENDING" | "REJECTED";

// All enrolling nodes are CAs (intermediate or issuing), so the parent must be
// able to issue a subordinate-ca cert. When leaf-node requesters are added
// in a future slice, this helper expands to a role switch.
const requiredKind = (role: NodeRole): CertKind => {
  void role; // reserved for future leaf-requester branch
  return "subordinate-ca";
};

export const canApprove = (req: EnrollmentRequest): { ok: boolean; reason?: string } => {
  const parent = getNodeByCn(req.parentCn);
  if (!parent) return { ok: false, reason: `Parent CA "${req.parentCn}" not found.` };
  if (!canIssue(parent).includes(requiredKind(req.role))) {
    return {
      ok: false,
      reason: `Parent ${parent.name} (${parent.identityState}) cannot issue this node's certificate.`,
    };
  }
  return { ok: true };
};

const daysFromNow = (days: number): string => {
  const base = Date.parse("2026-07-01T00:00:00Z");
  return new Date(base + days * 86_400_000).toISOString();
};

const seed = (): EnrollmentRequest[] => [
  {
    address: "10.20.1.80:8443",
    attestation: { nodeId: "nid-7f3a", tpm: "TPM · sealed" },
    csr: { keyType: "ECDSA P-384", subjectCn: "ACME Issuing CA G4" },
    id: "enr-0001",
    parentCn: "ACME Intermediate CA G1",
    proposedName: "acme-issuing-04",
    requestedAt: daysFromNow(-1),
    role: "issuing",
    status: "PENDING",
  },
  {
    address: "10.20.10.80:8443",
    attestation: { nodeId: "nid-2b9c", tpm: "TPM · sealed" },
    csr: { keyType: "ECDSA P-384", subjectCn: "ACME Intermediate CA R3" },
    id: "enr-0002",
    parentCn: "ACME Root CA R2",
    proposedName: "acme-intermediate-04",
    requestedAt: daysFromNow(-2),
    role: "intermediate",
    status: "PENDING",
  },
  {
    address: "10.20.2.80:8443",
    attestation: { nodeId: "nid-9d11", tpm: "UNAVAILABLE · nodeID" },
    csr: { keyType: "ECDSA P-256", subjectCn: "ACME Issuing CA H3" },
    id: "enr-0003",
    parentCn: "ACME Intermediate CA G2", // REVOKED parent -> cannot approve
    proposedName: "acme-issuing-h03",
    requestedAt: daysFromNow(-3),
    role: "issuing",
    status: "PENDING",
  },
];

let requests: EnrollmentRequest[] = seed();
const listeners = new Set<() => void>();
const emit = (): void => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const enrollmentsList = (): EnrollmentRequest[] => requests;
export const getEnrollment = (id: string): EnrollmentRequest | undefined =>
  requests.find((r) => r.id === id);

export const useEnrollments = (): EnrollmentRequest[] =>
  useSyncExternalStore(
    subscribe,
    () => requests,
    () => requests,
  );

let nextId = 9000;
export const requestEnrollment = (draft: EnrollmentDraft): EnrollmentRequest => {
  const req: EnrollmentRequest = {
    ...draft,
    id: `enr-${nextId++}`,
    requestedAt: daysFromNow(0),
    status: "PENDING",
  };
  requests = [req, ...requests];
  emit();
  return req;
};

const patch = (id: string, next: Partial<EnrollmentRequest>): void => {
  requests = requests.map((r) => (r.id === id ? { ...r, ...next } : r));
  emit();
};

// Approve: parent signs (capability-checked), the node joins the fleet. The
// AWAITING_CERT -> ESTABLISHED interim is modeled by admitting the node already
// established for the mock happy path.
export const approveEnrollment = (id: string): void => {
  const req = getEnrollment(id);
  if (!req || req.status !== "PENDING") return;
  if (!canApprove(req).ok) return;
  const node: Node = {
    address: req.address,
    bootCount: 1,
    cn: req.csr.subjectCn,
    fleetManager: { linked: true, peerCertDays: 0 },
    identityState: "ESTABLISHED",
    issued: 0,
    issuer: req.parentCn,
    name: req.proposedName,
    parentCn: req.parentCn,
    revoked: 0,
    role: req.role,
    tpm: req.attestation.tpm,
    uptime: "0d 00h",
  };
  addNode(node);
  patch(id, { admittedNodeName: node.name, status: "APPROVED" });
  recordAudit({
    kind: "enroll-approved",
    summary: `Approved enrollment ${req.proposedName} under ${req.parentCn}`,
    targetKind: "node",
    targetPath: `/nodes/${req.proposedName}`,
  });
};

export const rejectEnrollment = (id: string, reason: string): void => {
  const req = getEnrollment(id);
  if (!req || req.status !== "PENDING") return;
  patch(id, { rejectionReason: reason, status: "REJECTED" });
  recordAudit({
    kind: "enroll-rejected",
    summary: `Rejected enrollment ${req.proposedName} (${reason})`,
    targetKind: "enrollment",
  });
};

// Test-only.
export const __resetEnrollments = (): void => {
  requests = seed();
  nextId = 9000;
  emit();
};
