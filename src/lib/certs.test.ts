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

import { getNode } from "@/lib/mock";
import { canIssue, certsFor, issueCert, revokeCert, __resetCerts } from "@/lib/certs";

describe("canIssue", () => {
  it("gates by role and state", () => {
    expect(canIssue(getNode("acme-root-01")!)).toEqual(["subordinate-ca"]);
    expect(canIssue(getNode("acme-intermediate-01")!).sort()).toEqual(["leaf", "subordinate-ca"]);
    expect(canIssue(getNode("acme-issuing-01")!)).toEqual(["leaf"]);
    // acme-intermediate-02 is REVOKED
    expect(canIssue(getNode("acme-intermediate-02")!)).toEqual([]);
  });
});

describe("cert store", () => {
  beforeEach(() => __resetCerts());

  it("seeds certs for an established issuing CA", () => {
    expect(certsFor("acme-issuing-01").length).toBeGreaterThan(0);
  });

  it("issueCert adds a VALID cert to the issuer", () => {
    const before = certsFor("acme-issuing-01").length;
    const cert = issueCert("acme-issuing-01", {
      kind: "leaf",
      subjectCn: "web.acme.example",
      sans: ["web.acme.example"],
      eku: ["serverAuth"],
      validityDays: 90,
    });
    expect(cert.status).toBe("VALID");
    expect(cert.kind).toBe("leaf");
    expect(certsFor("acme-issuing-01").length).toBe(before + 1);
    expect(certsFor("acme-issuing-01").some((c) => c.serial === cert.serial)).toBe(true);
  });

  it("revokeCert flips status and records the reason", () => {
    const cert = issueCert("acme-issuing-01", {
      kind: "leaf",
      subjectCn: "api.acme.example",
      sans: [],
      eku: ["serverAuth"],
      validityDays: 30,
    });
    revokeCert(cert.serial, "keyCompromise");
    const updated = certsFor("acme-issuing-01").find((c) => c.serial === cert.serial);
    expect(updated?.status).toBe("REVOKED");
    expect(updated?.reason).toBe("keyCompromise");
  });
});
