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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Capture every RevokeCertificate call so the live path can be asserted without
// a real fetch. listCertificates resolves empty so the post-revoke refresh is a
// no-op rather than a hanging promise.
const revokeCertificate = vi.fn(() => Promise.resolve({}));
vi.mock("@/lib/fleet/client", () => ({
  fleetClient: () => ({
    listCertificates: () => Promise.resolve({ certificates: [] }),
    revokeCertificate,
  }),
}));

import { revokeCert } from "@/lib/certs";

describe("revokeCert live path", () => {
  beforeEach(() => {
    revokeCertificate.mockClear();
    vi.stubEnv("VITE_FLEET_MODE", "live");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls RevokeCertificate with the serial and the RFC 5280 reason code", async () => {
    await revokeCert("0A1B", "keyCompromise");

    expect(revokeCertificate).toHaveBeenCalledTimes(1);
    expect(revokeCertificate).toHaveBeenCalledWith(
      expect.objectContaining({ serialHex: "0A1B", reasonCode: 1 }),
    );
  });

  it("maps cessationOfOperation to reason code 5", async () => {
    await revokeCert("0C0D", "cessationOfOperation");

    expect(revokeCertificate).toHaveBeenCalledWith(
      expect.objectContaining({ serialHex: "0C0D", reasonCode: 5 }),
    );
  });
});
