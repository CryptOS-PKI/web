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
  __resetProfiles,
  createProfile,
  getProfile,
  profilesList,
  updateProfile,
} from "@/lib/profiles";

describe("profiles store", () => {
  beforeEach(() => __resetProfiles());

  it("seeds AD-relevant templates including a Domain Controller profile", () => {
    expect(profilesList().length).toBeGreaterThanOrEqual(5);
    expect(getProfile("Domain Controller")?.extKeyUsage).toContain("server_auth");
  });

  it("createProfile adds a profile and rejects a duplicate name", () => {
    const before = profilesList().length;
    const ok = createProfile({
      name: "VPN Client",
      keyAlg: "ECDSA-P384",
      validityDays: 365,
      isCA: false,
      keyUsage: ["digital_signature"],
      extKeyUsage: ["client_auth"],
      sans: [],
    });
    expect(ok.ok).toBe(true);
    expect(profilesList().length).toBe(before + 1);
    const dup = createProfile({
      name: "VPN Client",
      keyAlg: "ECDSA-P384",
      validityDays: 365,
      isCA: false,
      keyUsage: [],
      extKeyUsage: [],
      sans: [],
    });
    expect(dup.ok).toBe(false);
  });

  it("updateProfile patches by name", () => {
    updateProfile("Code Signing", { validityDays: 730 });
    expect(getProfile("Code Signing")?.validityDays).toBe(730);
  });
});
