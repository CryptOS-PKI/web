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
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { FleetPage } from "@/pages/fleet";
import { childrenOf, groupThreshold, mockNodes } from "@/lib/mock";

const renderFleet = () => {
  return render(
    <MemoryRouter>
      <FleetPage />
    </MemoryRouter>,
  );
};

// The CNs of the individually-drawn nodes (roots + intermediates); wide fan-outs
// collapse into a group box and are not drawn as circles.
const circleNodes = mockNodes.filter((n) => n.role !== "issuing");

describe("FleetPage", () => {
  it("renders the topology graph with every individually-drawn CA subject CN", () => {
    renderFleet();
    expect(screen.getByRole("img", { name: /CA fleet topology graph/i })).toBeInTheDocument();
    for (const node of circleNodes) {
      expect(screen.getAllByText(node.cn).length).toBeGreaterThan(0);
    }
  });

  it("collapses a wide fan-out into a group box instead of circles", () => {
    renderFleet();
    const parentCn = "ACME Intermediate CA G1";
    const members = childrenOf(parentCn);
    expect(members.length).toBeGreaterThan(groupThreshold);

    // The group header shows title, subtitle, and the member count; the member
    // CNs are hidden until the group is expanded.
    expect(screen.getByText("Issuing CAs")).toBeInTheDocument();
    expect(screen.getByText(`under ${parentCn}`)).toBeInTheDocument();
    expect(screen.getByText(String(members.length))).toBeInTheDocument();
    expect(screen.queryByText(members[0].cn)).not.toBeInTheDocument();
  });

  it("expands the group to reveal members and selects one into the detail panel", () => {
    renderFleet();
    const members = childrenOf("ACME Intermediate CA G1");

    fireEvent.click(screen.getByRole("button", { name: /Issuing CAs/i }));
    for (const m of members) {
      expect(screen.getByText(m.cn)).toBeInTheDocument();
    }

    fireEvent.click(screen.getByText(members[0].cn));
    expect(screen.getByText(`Node · ${members[0].name}`)).toBeInTheDocument();
  });

  it("shows the default selected node's detail panel", () => {
    renderFleet();
    // The default selection is the established intermediate.
    expect(screen.getByText(/Node · acme-intermediate-01/)).toBeInTheDocument();
    expect(screen.getByText("142 / 4")).toBeInTheDocument();
  });
});
