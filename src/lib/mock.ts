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

// Mock data layer for the Fleet Manager UI. Slice A is UI-first: there is no
// backend wiring yet (the api repo only generates Go stubs today, and
// Connect-Web is deferred). These typed fixtures stand in for the manager's
// gRPC responses so the palette, type, and shell render against real shapes.

export type NodeRole = "root" | "intermediate" | "issuing";

export type IdentityState = "ESTABLISHED" | "AWAITING_CERT";

export interface Node {
  /** Operator-facing node name (also the route param). */
  name: string;
  /** mTLS gRPC address the manager reaches the node on. */
  address: string;
  role: NodeRole;
  identityState: IdentityState;
  /** Common name of the CA that issued this node's identity certificate. */
  issuer: string;
  /** Count of leaf certificates this node has issued. */
  issued: number;
  /** Count of certificates this node has revoked. */
  revoked: number;
  /** TPM / hardware-root attestation summary for the node's key material. */
  tpm: string;
}

export const mockNodes: Node[] = [
  {
    name: "acme-root-01",
    address: "10.20.0.11:8443",
    role: "root",
    identityState: "ESTABLISHED",
    issuer: "self-signed",
    issued: 3,
    revoked: 0,
    tpm: "TPM 2.0 (attested)",
  },
  {
    name: "acme-intermediate-01",
    address: "10.20.0.21:8443",
    role: "intermediate",
    identityState: "ESTABLISHED",
    issuer: "acme-root-01",
    issued: 142,
    revoked: 4,
    tpm: "TPM 2.0 (attested)",
  },
  {
    name: "acme-issuing-01",
    address: "10.20.0.31:8443",
    role: "issuing",
    identityState: "AWAITING_CERT",
    issuer: "acme-intermediate-01",
    issued: 0,
    revoked: 0,
    tpm: "TPM 2.0 (pending attestation)",
  },
];

export function getNode(name: string): Node | undefined {
  return mockNodes.find((node) => node.name === name);
}

export const roleLabels: Record<NodeRole, string> = {
  root: "Root CA",
  intermediate: "Intermediate CA",
  issuing: "Issuing CA",
};
