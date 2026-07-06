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
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { FleetPage } from "@/pages/fleet";
import { mockNodes } from "@/lib/mock";

function renderFleet() {
  return render(
    <MemoryRouter>
      <FleetPage />
    </MemoryRouter>,
  );
}

describe("FleetPage", () => {
  it("renders the topology graph with every CA subject CN", () => {
    renderFleet();
    expect(screen.getByRole("img", { name: /CA fleet topology graph/i })).toBeInTheDocument();
    for (const node of mockNodes) {
      expect(screen.getAllByText(node.cn).length).toBeGreaterThan(0);
    }
  });

  it("shows the default selected node's detail panel", () => {
    renderFleet();
    // The default selection is the established intermediate.
    expect(screen.getByText(/Node · acme-intermediate-01/)).toBeInTheDocument();
    expect(screen.getByText("142 / 4")).toBeInTheDocument();
  });
});
