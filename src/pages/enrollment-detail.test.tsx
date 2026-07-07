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

import { __resetCerts } from "@/lib/certs";
import { __resetEnrollments, getEnrollment } from "@/lib/enrollment";
import { __resetNodes, getNode } from "@/lib/nodes";
import { EnrollmentDetailPage } from "@/pages/enrollment-detail";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<EnrollmentDetailPage />} path="/enrollment/:id" />
        <Route element={<div>queue</div>} path="/enrollment" />
        <Route element={<div>node hub</div>} path="/nodes/:name" />
      </Routes>
    </MemoryRouter>,
  );

describe("EnrollmentDetailPage", () => {
  beforeEach(() => {
    __resetNodes();
    __resetCerts();
    __resetEnrollments();
  });

  it("approves a capable request and admits the node", () => {
    renderAt("/enrollment/enr-0001"); // parent G1 established -> approvable
    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
    expect(getEnrollment("enr-0001")?.status).toBe("APPROVED");
    expect(getNode("acme-issuing-04")?.identityState).toBe("ESTABLISHED");
  });

  it("blocks approve when the parent cannot issue", () => {
    renderAt("/enrollment/enr-0003"); // parent G2 revoked
    expect(screen.getByRole("button", { name: /^approve$/i })).toBeDisabled();
    expect(screen.getByText(/cannot issue/i)).toBeInTheDocument();
  });

  it("rejects with a reason and admits no node", () => {
    renderAt("/enrollment/enr-0002");
    fireEvent.click(screen.getByRole("button", { name: /^reject$/i }));
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "bad attestation" } });
    fireEvent.click(screen.getByRole("button", { name: /^confirm reject$/i }));
    expect(getEnrollment("enr-0002")?.status).toBe("REJECTED");
    expect(getNode("acme-intermediate-04")).toBeUndefined();
  });
});
