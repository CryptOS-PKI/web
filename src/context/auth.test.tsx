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

import { Code, ConnectError } from "@connectrpc/connect";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/context/auth";

const whoAmI = vi.fn();
const fleetMode = vi.fn(() => "live");
vi.mock("@/lib/fleet/client", () => ({ fleetClient: () => ({ whoAmI }) }));
vi.mock("@/lib/fleet/mode", () => ({ fleetMode: () => fleetMode() }));

const Probe = () => {
  const { login, operator, reason, status } = useAuth();
  return (
    <div>
      <span data-testid="state">
        {status}:{operator?.level ?? "none"}:{reason ?? "none"}
      </span>
      <button onClick={login} type="button">
        sign in
      </button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

const state = () => screen.getByTestId("state").textContent;

describe("AuthProvider", () => {
  beforeEach(() => {
    whoAmI.mockReset();
    fleetMode.mockReturnValue("live");
  });

  // The point of #68: arriving at the page must not sign you in, even holding a
  // valid certificate. Nothing is asked of the API until Login is clicked.
  it("starts anonymous without calling WhoAmI", () => {
    renderProbe();

    expect(state()).toBe("anonymous:none:none");
    expect(whoAmI).not.toHaveBeenCalled();
  });

  it("populates operator and level from WhoAmI on login", async () => {
    whoAmI.mockResolvedValue({
      operator: { cn: "op@acme.example", level: "admin", serial: "0A:BC" },
    });
    renderProbe();

    screen.getByRole("button", { name: /sign in/i }).click();

    await waitFor(() => expect(state()).toBe("authenticated:admin:none"));
    expect(whoAmI).toHaveBeenCalledTimes(1);
  });

  // An unknown level must not inherit privilege it was not granted.
  it("treats an unrecognised level as viewer", async () => {
    whoAmI.mockResolvedValue({
      operator: { cn: "op@acme.example", level: "wizard", serial: "0A:BC" },
    });
    renderProbe();

    screen.getByRole("button", { name: /sign in/i }).click();

    await waitFor(() => expect(state()).toBe("authenticated:viewer:none"));
  });

  it("goes denied when WhoAmI returns no operator", async () => {
    whoAmI.mockResolvedValue({ operator: undefined });
    renderProbe();

    screen.getByRole("button", { name: /sign in/i }).click();

    await waitFor(() => expect(state()).toBe("denied:none:not-authorized"));
  });

  // 401 from the manager means the TLS handshake carried no client certificate:
  // the operator has none installed, which is a different message from holding
  // one the fleet will not accept.
  it("reports a missing certificate when the API answers unauthenticated", async () => {
    whoAmI.mockRejectedValue(new ConnectError("no cert", Code.Unauthenticated));
    renderProbe();

    screen.getByRole("button", { name: /sign in/i }).click();

    await waitFor(() => expect(state()).toBe("denied:none:no-certificate"));
  });

  it("reports an unauthorized certificate when the API answers permission denied", async () => {
    whoAmI.mockRejectedValue(new ConnectError("no level", Code.PermissionDenied));
    renderProbe();

    screen.getByRole("button", { name: /sign in/i }).click();

    await waitFor(() => expect(state()).toBe("denied:none:not-authorized"));
  });

  // A transport failure is not an authorization answer, and saying "install a
  // certificate" would send the operator down the wrong path.
  it("reports unavailable when the API cannot be reached", async () => {
    whoAmI.mockRejectedValue(new ConnectError("down", Code.Unavailable));
    renderProbe();

    screen.getByRole("button", { name: /sign in/i }).click();

    await waitFor(() => expect(state()).toBe("denied:none:unavailable"));
  });

  it("can be retried after a denial", async () => {
    whoAmI.mockRejectedValueOnce(new ConnectError("no cert", Code.Unauthenticated));
    whoAmI.mockResolvedValueOnce({
      operator: { cn: "op@acme.example", level: "operator", serial: "0A:BC" },
    });
    renderProbe();
    const button = screen.getByRole("button", { name: /sign in/i });

    button.click();
    await waitFor(() => expect(state()).toBe("denied:none:no-certificate"));

    button.click();
    await waitFor(() => expect(state()).toBe("authenticated:operator:none"));
  });

  // Mock mode has no browser certificate to present, but it must still go
  // through the same explicit login rather than short-circuiting to signed in.
  it("still requires an explicit login in mock mode", async () => {
    fleetMode.mockReturnValue("mock");
    renderProbe();

    expect(state()).toBe("anonymous:none:none");

    screen.getByRole("button", { name: /sign in/i }).click();

    await waitFor(() => expect(state()).toBe("authenticated:admin:none"));
    expect(whoAmI).not.toHaveBeenCalled();
  });
});
