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

import { __resetEnrollments, enrollmentsList } from "@/lib/enrollment";
import { EnrollmentPage } from "@/pages/enrollment";

describe("EnrollmentPage", () => {
  beforeEach(() => __resetEnrollments());

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
});
