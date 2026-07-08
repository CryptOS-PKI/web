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

import { mockNodes } from "@/lib/mock";
import { __resetNodes, addNode, chainToRoot, getNode, nodesList } from "@/lib/nodes";

describe("nodes store", () => {
  beforeEach(() => __resetNodes());

  it("seeds from the mock fixture", () => {
    expect(nodesList().length).toBe(mockNodes.length);
    expect(getNode("acme-root-01")?.role).toBe("root");
  });

  it("nodesList reference is stable between reads", () => {
    expect(nodesList()).toBe(nodesList());
  });

  it("addNode appends and getNode resolves it; reference changes on mutation", () => {
    const before = nodesList();
    addNode({
      name: "acme-issuing-x9",
      address: "10.20.9.9:8443",
      role: "issuing",
      identityState: "ESTABLISHED",
      cn: "ACME Issuing CA X9",
      parentCn: "ACME Intermediate CA G1",
      issuer: "ACME Intermediate CA G1",
      issued: 0,
      revoked: 0,
      tpm: "UNAVAILABLE · nodeID",
      fleetManager: { linked: true, peerCertDays: 1 },
      bootCount: 1,
      uptime: "0d 01h",
    });
    expect(nodesList()).not.toBe(before);
    expect(nodesList().length).toBe(before.length + 1);
    expect(getNode("acme-issuing-x9")?.cn).toBe("ACME Issuing CA X9");
  });
});

describe("chainToRoot", () => {
  it("returns the ordered chain from the root to the node", () => {
    const chain = chainToRoot(getNode("acme-issuing-01")!).map((n) => n.name);
    expect(chain[0]).toBe("acme-root-01");
    expect(chain[chain.length - 1]).toBe("acme-issuing-01");
    expect(chain).toContain("acme-intermediate-01");
  });

  it("returns a single element for a root", () => {
    expect(chainToRoot(getNode("acme-root-01")!).map((n) => n.name)).toEqual(["acme-root-01"]);
  });
});
