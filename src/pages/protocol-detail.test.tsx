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

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { __resetAdapters, getAdapter } from "@/lib/adapters";
import { __resetProfiles } from "@/lib/profiles";
import { ProtocolDetailPage } from "@/pages/protocol-detail";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtocolDetailPage />} path="/protocols/:kind" />
        <Route element={<div>protocols list</div>} path="/protocols" />
      </Routes>
    </MemoryRouter>,
  );

describe("ProtocolDetailPage", () => {
  beforeEach(() => {
    __resetAdapters();
    __resetProfiles();
  });

  it("edits an adapter's bound profile", () => {
    renderAt("/protocols/acme");
    fireEvent.change(screen.getByLabelText(/bound profile/i), {
      target: { value: "Domain Controller" },
    });
    expect(getAdapter("acme")?.profile).toBe("Domain Controller");
  });

  it("redirects an unknown protocol to the list", () => {
    renderAt("/protocols/nope");
    expect(screen.getByText("protocols list")).toBeInTheDocument();
  });
});
