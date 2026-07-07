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

import { describe, expect, it } from "vitest";

import { mockNodes } from "@/lib/mock";
import { computeFocusLayout } from "@/lib/topology-layout";

describe("computeFocusLayout", () => {
  it("puts the Root first on the spine and the focus last", () => {
    const l = computeFocusLayout("acme-issuing-01", mockNodes);
    expect(l.spine[0].cn).toBe("ACME Root CA G1");
    expect(l.spine.at(-1)).toBe(l.focus);
    expect(l.focus.name).toBe("acme-issuing-01");
    expect(l.spine.map((p) => p.cn)).toEqual([
      "ACME Root CA G1",
      "ACME Intermediate CA G1",
      "ACME Issuing CA G01",
    ]);
  });

  it("fans an intermediate's wide child set into a group downstream", () => {
    const l = computeFocusLayout("acme-intermediate-01", mockNodes);
    expect(l.downstream.kind).toBe("group");
    if (l.downstream.kind === "group") {
      expect(l.downstream.members).toHaveLength(12);
    }
  });

  it("renders an issuing CA's downstream as a leaf count", () => {
    const l = computeFocusLayout("acme-issuing-01", mockNodes);
    expect(l.downstream.kind).toBe("leaves");
    if (l.downstream.kind === "leaves") {
      expect(l.downstream.count).toBe(60);
    }
  });

  it("draws a small child set as individual nodes", () => {
    const l = computeFocusLayout("acme-intermediate-03", mockNodes);
    expect(l.downstream.kind).toBe("nodes");
    if (l.downstream.kind === "nodes") {
      expect(l.downstream.nodes).toHaveLength(3);
    }
  });

  it("collapses a wide sibling set into one aggregated chip", () => {
    const l = computeFocusLayout("acme-issuing-01", mockNodes);
    const sib = l.chips.find((c) => c.refocus.startsWith("acme-issuing-"));
    expect(sib?.count).toBe(11);
    expect(sib?.label).toContain("sibling");
  });

  it("lists a small off-path branch set as one chip per branch", () => {
    const l = computeFocusLayout("acme-intermediate-01", mockNodes);
    const labels = l.chips.map((c) => c.label).sort();
    expect(labels).toContain("ACME Intermediate CA G2");
    expect(labels).toContain("ACME Intermediate CA G3");
  });

  it("gives a Root focus no off-path chips", () => {
    const l = computeFocusLayout("acme-root-01", mockNodes);
    expect(l.chips).toHaveLength(0);
    expect(l.spine).toHaveLength(1);
  });

  it("colors a fully-revoked branch chip as REVOKED", () => {
    const l = computeFocusLayout("acme-intermediate-01", mockNodes);
    const g2 = l.chips.find((c) => c.label === "ACME Intermediate CA G2");
    expect(g2?.state).toBe("REVOKED");
  });
});
