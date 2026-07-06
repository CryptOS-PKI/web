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

// Mock data layer for the Fleet Manager UI. This slice is UI-first: there is no
// backend wiring yet (the api repo only generates Go stubs today, and
// Connect-Web is deferred). These typed fixtures stand in for the manager's
// gRPC responses so the palette, type, and shell render against real shapes.
//
// The model is a small trust topology: nodes are CAs, and each non-root node
// names its parent by common name (`parentCn`), which the topology view resolves
// into feeder edges. The identity state drives both the node ring color and the
// color of the feeder that flows toward the child.

export type NodeRole = "root" | "intermediate" | "issuing";

export type IdentityState = "ESTABLISHED" | "AWAITING_CERT" | "REVOKED";

/** Fleet Manager peer-cert linkage for a node. */
export interface FleetManagerLink {
  /** Whether the node currently holds a valid peer certificate. */
  linked: boolean;
  /** Age of the peer certificate in days; undefined when pulled/unlinked. */
  peerCertDays?: number;
  /** Free-form status for the revoked/unlinked case. */
  note?: string;
}

export interface Node {
  /** Operator-facing node name (also the route param). */
  name: string;
  /** mTLS gRPC address the manager reaches the node on. */
  address: string;
  role: NodeRole;
  identityState: IdentityState;
  /** Subject common name on this CA's own certificate. */
  cn: string;
  /** Common name of the parent CA that signs this node; undefined for the root. */
  parentCn?: string;
  /** Human summary of the issuer, as rendered in the detail panel. */
  issuer: string;
  /** Count of leaf/sub-CA certificates this node has issued. */
  issued: number;
  /** Count of certificates this node has revoked. */
  revoked: number;
  /** TPM / hardware-root attestation summary for the node's key material. */
  tpm: string;
  /** Fleet Manager peer-cert linkage. */
  fleetManager: FleetManagerLink;
  /** Times the node has booted. */
  bootCount: number;
  /** Human-readable uptime since last boot. */
  uptime: string;
  /** CRL distribution point; present only once the CA is established and issuing. */
  crl?: string;
  /** OCSP responder endpoint; present only once the CA is established and issuing. */
  ocsp?: string;
}

export const mockNodes: Node[] = [
  {
    name: "acme-root-01",
    address: "10.20.0.11:8443",
    role: "root",
    identityState: "ESTABLISHED",
    cn: "ACME Root CA G1",
    issuer: "self-signed",
    issued: 3,
    revoked: 0,
    tpm: "TPM · sealed",
    fleetManager: { linked: true, peerCertDays: 88 },
    bootCount: 1,
    uptime: "21d 03h",
  },
  {
    name: "acme-intermediate-01",
    address: "10.20.0.21:8443",
    role: "intermediate",
    identityState: "ESTABLISHED",
    cn: "ACME Intermediate CA G1",
    parentCn: "ACME Root CA G1",
    issuer: "ACME Root CA G1",
    issued: 142,
    revoked: 4,
    tpm: "UNAVAILABLE · nodeID",
    fleetManager: { linked: true, peerCertDays: 63 },
    bootCount: 1,
    uptime: "6d 04h",
    crl: "http://pki.acme.example/int-g1/crl",
    ocsp: "http://pki.acme.example/int-g1/ocsp",
  },
  {
    name: "acme-intermediate-02",
    address: "10.20.0.22:8443",
    role: "intermediate",
    identityState: "REVOKED",
    cn: "ACME Intermediate CA G2",
    parentCn: "ACME Root CA G1",
    issuer: "ACME Root CA G1",
    issued: 51,
    revoked: 51,
    tpm: "UNAVAILABLE · nodeID",
    fleetManager: { linked: false, note: "peer cert pulled" },
    bootCount: 2,
    uptime: "12d 09h",
    crl: "http://pki.acme.example/int-g2/crl",
    ocsp: "http://pki.acme.example/int-g2/ocsp",
  },
  {
    name: "acme-issuing-01",
    address: "10.20.0.31:8443",
    role: "issuing",
    identityState: "AWAITING_CERT",
    cn: "ACME Issuing CA G1",
    parentCn: "ACME Intermediate CA G1",
    issuer: "ACME Intermediate CA G1 (pending)",
    issued: 0,
    revoked: 0,
    tpm: "UNAVAILABLE · nodeID",
    fleetManager: { linked: true, peerCertDays: 90 },
    bootCount: 1,
    uptime: "0d 02h",
  },
];

export function getNode(name: string): Node | undefined {
  return mockNodes.find((node) => node.name === name);
}

/** Resolve a node by its subject common name. */
export function getNodeByCn(cn: string): Node | undefined {
  return mockNodes.find((node) => node.cn === cn);
}

export const roleLabels: Record<NodeRole, string> = {
  root: "Root CA",
  intermediate: "Intermediate CA",
  issuing: "Issuing CA",
};

export const identityStateLabels: Record<IdentityState, string> = {
  ESTABLISHED: "ESTABLISHED",
  AWAITING_CERT: "AWAITING_CERT",
  REVOKED: "REVOKED",
};

/** A resolved trust edge from a parent CA to a child CA. */
export interface TrustEdge {
  parent: Node;
  child: Node;
}

/** Every parent->child trust edge implied by the nodes' `parentCn` links. */
export function trustEdges(): TrustEdge[] {
  const edges: TrustEdge[] = [];
  for (const child of mockNodes) {
    if (!child.parentCn) continue;
    const parent = getNodeByCn(child.parentCn);
    if (parent) edges.push({ parent, child });
  }
  return edges;
}
