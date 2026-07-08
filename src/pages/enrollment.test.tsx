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
import { beforeEach, describe, expect, it } from "vitest";

import { __resetEnrollments, approveEnrollment, enrollmentsList } from "@/lib/enrollment";
import { __resetNodes } from "@/lib/nodes";
import { EnrollmentPage } from "@/pages/enrollment";

describe("EnrollmentPage", () => {
  beforeEach(() => {
    __resetNodes();
    __resetEnrollments();
  });

  it("lists a pending request linking to its detail", () => {
    render(
      <MemoryRouter>
        <EnrollmentPage />
      </MemoryRouter>,
    );
    const first = enrollmentsList().find((r) => r.status === "PENDING")!;
    expect(screen.getByRole("link", { name: new RegExp(first.proposedName) })).toHaveAttribute(
      "href",
      `/enrollment/${first.id}`,
    );
  });

  it("simulate incoming request adds a pending row", () => {
    render(
      <MemoryRouter>
        <EnrollmentPage />
      </MemoryRouter>,
    );
    const before = enrollmentsList().length;
    fireEvent.click(screen.getByRole("button", { name: /simulate/i }));
    expect(enrollmentsList().length).toBe(before + 1);
  });

  it("narrows to PENDING via the Status facet, hiding an APPROVED row", () => {
    approveEnrollment("enr-0001"); // parent G1 established -> approvable
    const approved = enrollmentsList().find((r) => r.status === "APPROVED")!;
    const pending = enrollmentsList().find((r) => r.status === "PENDING")!;

    render(
      <MemoryRouter>
        <EnrollmentPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(approved.proposedName)).toBeInTheDocument();

    const facetToggle = screen
      .getAllByRole("button", { name: /status/i })
      .find((button) => !button.closest("table"));
    if (!facetToggle) throw new Error("facet toggle not found");
    fireEvent.click(facetToggle);
    const pendingOption = screen
      .getAllByText("PENDING")
      .find((element) => !element.closest("table"));
    if (!pendingOption) throw new Error("PENDING option not found");
    fireEvent.click(pendingOption);

    expect(screen.getByText(pending.proposedName)).toBeInTheDocument();
    expect(screen.queryByText(approved.proposedName)).not.toBeInTheDocument();
  });
});
