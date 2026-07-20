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
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { __resetAdapters, getAdapter } from "@/lib/adapters";
import { ProtocolsPage } from "@/pages/protocols";

// mock mode keeps the in-memory catalog; the auth gate is mocked to an admin so
// the toggle controls render without an AuthProvider.
vi.mock("@/context/auth", () => ({
  useAuth: () => ({
    operator: { commonName: "admin@acme.example", level: "admin", serial: "AA" },
    status: "authenticated",
  }),
}));

describe("ProtocolsPage", () => {
  beforeEach(() => __resetAdapters());

  it("lists adapters linking to their detail", () => {
    render(
      <MemoryRouter>
        <ProtocolsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /ACME/ })).toHaveAttribute("href", "/protocols/acme");
  });

  it("shows the honest engine-pending note", () => {
    render(
      <MemoryRouter>
        <ProtocolsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("note")).toHaveTextContent(/does not yet serve enrollment requests/i);
  });

  it("toggles an adapter from the row", async () => {
    render(
      <MemoryRouter>
        <ProtocolsPage />
      </MemoryRouter>,
    );
    expect(getAdapter("scep")?.enabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /enable scep/i }));
    await waitFor(() => expect(getAdapter("scep")?.enabled).toBe(true));
  });
});
