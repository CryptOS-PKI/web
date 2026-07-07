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

import {
  __resetAdapters,
  adaptersList,
  getAdapter,
  setEnabled,
  updateAdapter,
} from "@/lib/adapters";

describe("adapters store", () => {
  beforeEach(() => __resetAdapters());

  it("seeds four adapters with ACME enabled and bound to the LDAPS profile", () => {
    expect(adaptersList().length).toBe(4);
    expect(getAdapter("acme")?.enabled).toBe(true);
    expect(getAdapter("acme")?.profile).toBe("TLS Server (LDAPS)");
    expect(getAdapter("scep")?.enabled).toBe(false);
  });

  it("setEnabled toggles an adapter", () => {
    setEnabled("scep", true);
    expect(getAdapter("scep")?.enabled).toBe(true);
  });

  it("updateAdapter patches the bound profile", () => {
    updateAdapter("acme", { profile: "Domain Controller" });
    expect(getAdapter("acme")?.profile).toBe("Domain Controller");
  });
});
