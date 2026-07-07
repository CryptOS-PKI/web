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
import { computeTreeLayout } from "@/lib/topology-layout";

describe("computeTreeLayout", () => {
  it("places every node and links every parent->child edge", () => {
    const l = computeTreeLayout(mockNodes);
    expect(l.nodes).toHaveLength(mockNodes.length);
    expect(l.edges).toHaveLength(mockNodes.filter((n) => n.parentCn).length);
    expect(l.byName["acme-root-01"].role).toBe("root");
  });

  it("puts the Root at the leftmost depth column", () => {
    const l = computeTreeLayout(mockNodes);
    const minX = Math.min(...l.nodes.map((p) => p.x));
    expect(l.byName["acme-root-01"].x).toBe(minX);
  });

  it("marks parents as expandable and leaves as not", () => {
    const l = computeTreeLayout(mockNodes);
    expect(l.byName["acme-intermediate-01"].hasChildren).toBe(true);
    expect(l.byName["acme-issuing-01"].hasChildren).toBe(false);
  });

  it("collapsing a node hides its subtree and re-packs the tree", () => {
    const full = computeTreeLayout(mockNodes);
    const collapsed = computeTreeLayout(mockNodes, new Set(["acme-intermediate-01"]));
    // Intermediate G1 has 12 issuing children, all removed from the layout.
    expect(collapsed.nodes).toHaveLength(full.nodes.length - 12);
    expect(collapsed.byName["acme-intermediate-01"].collapsed).toBe(true);
    expect(collapsed.byName["acme-issuing-01"]).toBeUndefined();
    expect(collapsed.edges.some((e) => e.to === "acme-issuing-01")).toBe(false);
  });

  it("keeps a positive bounding box", () => {
    const { bounds } = computeTreeLayout(mockNodes);
    expect(bounds.maxX).toBeGreaterThan(bounds.minX);
    expect(bounds.maxY).toBeGreaterThan(bounds.minY);
  });
});
