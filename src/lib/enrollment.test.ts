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

import { beforeEach, describe, expect, it } from "vitest";

import { __resetCerts } from "@/lib/certs";
import {
  __resetEnrollments,
  approveEnrollment,
  canApprove,
  enrollmentsList,
  getEnrollment,
  rejectEnrollment,
  requestEnrollment,
} from "@/lib/enrollment";
import { __resetNodes, getNode } from "@/lib/nodes";

describe("enrollment store", () => {
  beforeEach(() => {
    __resetNodes();
    __resetCerts();
    __resetEnrollments();
  });

  it("seeds pending requests", () => {
    expect(enrollmentsList().some((r) => r.status === "PENDING")).toBe(true);
  });

  it("approve under a capable parent admits an ESTABLISHED node", () => {
    const req = requestEnrollment({
      address: "10.20.1.90:8443",
      attestation: { nodeId: "nid-new", tpm: "TPM · sealed" },
      csr: { keyType: "ECDSA P-384", subjectCn: "ACME Issuing CA NEW" },
      parentCn: "ACME Intermediate CA G1", // ESTABLISHED intermediate -> can issue
      proposedName: "acme-issuing-new",
      role: "issuing",
    });
    approveEnrollment(req.id);
    expect(getEnrollment(req.id)?.status).toBe("APPROVED");
    const admitted = getNode("acme-issuing-new");
    expect(admitted?.identityState).toBe("ESTABLISHED");
    expect(getEnrollment(req.id)?.admittedNodeName).toBe("acme-issuing-new");
  });

  it("canApprove is false when the parent cannot issue (revoked parent)", () => {
    const req = requestEnrollment({
      address: "10.20.2.90:8443",
      attestation: { nodeId: "nid-bad", tpm: "UNAVAILABLE · nodeID" },
      csr: { keyType: "ECDSA P-384", subjectCn: "ACME Issuing CA BAD" },
      parentCn: "ACME Intermediate CA G2", // REVOKED -> cannot issue
      proposedName: "acme-issuing-bad",
      role: "issuing",
    });
    expect(canApprove(req).ok).toBe(false);
  });

  it("reject records the reason and admits no node", () => {
    const req = requestEnrollment({
      address: "10.20.1.91:8443",
      attestation: { nodeId: "nid-rej", tpm: "TPM · sealed" },
      csr: { keyType: "ECDSA P-384", subjectCn: "ACME Issuing CA REJ" },
      parentCn: "ACME Intermediate CA G1",
      proposedName: "acme-issuing-rej",
      role: "issuing",
    });
    rejectEnrollment(req.id, "failed attestation");
    expect(getEnrollment(req.id)?.status).toBe("REJECTED");
    expect(getEnrollment(req.id)?.rejectionReason).toBe("failed attestation");
    expect(getNode("acme-issuing-rej")).toBeUndefined();
  });
});
