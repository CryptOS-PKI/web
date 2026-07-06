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

import { aggregateState, childrenOf, getNodeByCn } from "@/lib/mock";

describe("mock topology", () => {
  it("has three intermediates under the root, each with a fan-out", () => {
    expect(
      childrenOf("ACME Root CA G1")
        .map((n) => n.cn)
        .sort(),
    ).toEqual(["ACME Intermediate CA G1", "ACME Intermediate CA G2", "ACME Intermediate CA G3"]);
    expect(childrenOf("ACME Intermediate CA G1")).toHaveLength(12);
    expect(childrenOf("ACME Intermediate CA G2")).toHaveLength(6);
    expect(childrenOf("ACME Intermediate CA G3")).toHaveLength(3);
  });

  it("makes the G2 branch fully revoked and the G3 branch established", () => {
    expect(getNodeByCn("ACME Intermediate CA G2")?.identityState).toBe("REVOKED");
    expect(aggregateState(childrenOf("ACME Intermediate CA G2"))).toBe("REVOKED");
    expect(aggregateState(childrenOf("ACME Intermediate CA G3"))).toBe("ESTABLISHED");
  });
});
