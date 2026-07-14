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

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/context/auth";

const whoAmI = vi.fn();
vi.mock("@/lib/fleet/client", () => ({ fleetClient: () => ({ whoAmI }) }));
vi.mock("@/lib/fleet/mode", () => ({ fleetMode: () => "live" }));

const Probe = () => {
  const { operator, status } = useAuth();
  return (
    <div>
      {status}:{operator?.level ?? "none"}
    </div>
  );
};

describe("AuthProvider (live)", () => {
  beforeEach(() => whoAmI.mockReset());

  it("populates operator + level from WhoAmI", async () => {
    whoAmI.mockResolvedValue({
      operator: { cn: "op@acme.example", level: "admin", serial: "0A:BC" },
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText("authenticated:admin")).toBeInTheDocument());
  });

  it("goes denied when WhoAmI returns no operator", async () => {
    // The manager withholds an operator identity when the presented cert is not
    // a valid operator; the provider renders the denied gate. (The parallel
    // rejected-RPC path runs the same setState in the provider's .catch.)
    whoAmI.mockResolvedValue({ operator: undefined });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText("denied:none")).toBeInTheDocument());
  });
});
