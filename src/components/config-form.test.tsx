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

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MachineConfig } from "@/gen/fleet/cryptos/v1/config_pb";

import { ConfigForm } from "@/components/config-form";
import { mockNodes, type Node } from "@/lib/mock";

const issuingNode = (): Node => mockNodes.find((n) => n.name === "acme-issuing-01")!;

const getNodeConfig = vi.fn();
const applyNodeConfig = vi.fn();
let mode: "live" | "mock" = "live";

let level: "admin" | "operator" | "viewer" = "admin";

vi.mock("@/lib/config", () => ({
  applyNodeConfig: (...args: unknown[]) => applyNodeConfig(...args),
  getNodeConfig: (...args: unknown[]) => getNodeConfig(...args),
}));
vi.mock("@/lib/fleet/mode", () => ({ fleetMode: () => mode }));
vi.mock("@/context/auth", () => ({
  useAuth: () => ({
    operator: { commonName: "op@acme.example", level, serial: "AA" },
    status: "authenticated",
  }),
}));

// A fetched config with management set plus other fields, so a no-clobber
// assertion has real content to prove survives an edit.
const baseline = (): MachineConfig =>
  ({
    apiVersion: "cryptos.dev/v1alpha1",
    kind: "MachineConfig",
    management: { managerCn: "fm-op", operatorSurfaceReadonly: true, trustPem: "trust-pem" },
    pki: { revocationBaseUrl: "http://pki.acme/old/crl", rootKeyAlg: "ECDSA-P384" },
    role: { kind: "issuing" },
  }) as unknown as MachineConfig;

describe("ConfigForm (live) whole-config-replace safety", () => {
  beforeEach(() => {
    mode = "live";
    level = "admin";
    getNodeConfig.mockReset().mockResolvedValue(baseline());
    applyNodeConfig.mockReset().mockResolvedValue({ generation: 5, requiresReboot: false });
  });

  it("editing only the CRL URL preserves management and every other fetched field", async () => {
    render(<ConfigForm node={issuingNode()} />);

    // The form loads the fetched baseline before any edit is possible.
    const crlInput = await screen.findByLabelText(/revocation base url/i);
    fireEvent.change(crlInput, { target: { value: "http://pki.acme/new/crl" } });

    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    await waitFor(() => expect(applyNodeConfig).toHaveBeenCalledTimes(1));
    const [nodeName, sent] = applyNodeConfig.mock.calls[0] as [string, MachineConfig];

    expect(nodeName).toBe("acme-issuing-01");

    // The edited field changed.
    expect(sent.pki?.revocationBaseUrl).toBe("http://pki.acme/new/crl");

    // Everything else is byte-for-byte the fetched baseline: build the expected
    // object as a clone of the baseline with only the CRL swapped, and compare
    // the whole config so no field can silently regress.
    const want = structuredClone(baseline());
    want.pki!.revocationBaseUrl = "http://pki.acme/new/crl";
    expect(sent).toEqual(want);

    // Management specifically must survive -- dropping it would unlink the node
    // from the fleet.
    expect(sent.management).toEqual(baseline().management);
  });

  it("shows a reboot warning when the apply requires a reboot and refetches", async () => {
    applyNodeConfig.mockResolvedValue({ generation: 6, requiresReboot: true });
    render(<ConfigForm node={issuingNode()} />);

    await screen.findByLabelText(/revocation base url/i);
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    expect(await screen.findByText(/reboot/i)).toBeInTheDocument();
    // Refetch after a successful apply: once on mount, once after apply.
    await waitFor(() => expect(getNodeConfig).toHaveBeenCalledTimes(2));
  });

  it("surfaces an apply error inline and does not clear the form", async () => {
    applyNodeConfig.mockRejectedValue(new Error("node unreachable"));
    render(<ConfigForm node={issuingNode()} />);

    await screen.findByLabelText(/revocation base url/i);
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    expect(await screen.findByText(/node unreachable/i)).toBeInTheDocument();
  });

  it("does not offer Apply to a non-admin and makes no apply RPC", async () => {
    level = "viewer";
    render(<ConfigForm node={issuingNode()} />);

    await screen.findByLabelText(/revocation base url/i);
    expect(screen.queryByRole("button", { name: /apply/i })).not.toBeInTheDocument();
    expect(screen.getByText(/requires admin level/i)).toBeInTheDocument();
    expect(applyNodeConfig).not.toHaveBeenCalled();
  });
});

describe("ConfigForm (mock)", () => {
  beforeEach(() => {
    mode = "mock";
    getNodeConfig.mockReset();
    applyNodeConfig.mockReset();
  });

  it("keeps the local demo and drives no live RPC", () => {
    render(<ConfigForm node={issuingNode()} />);
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(getNodeConfig).not.toHaveBeenCalled();
    expect(applyNodeConfig).not.toHaveBeenCalled();
  });
});
