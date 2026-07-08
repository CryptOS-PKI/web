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

import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { __resetCerts, allCerts } from "@/lib/certs";
import { __resetNodes } from "@/lib/nodes";
import { CertificatesPage } from "@/pages/certificates";

describe("CertificatesPage", () => {
  beforeEach(() => {
    __resetNodes();
    __resetCerts();
  });

  it("lists seeded certs and links the subject to the cert detail", () => {
    render(
      <MemoryRouter>
        <CertificatesPage />
      </MemoryRouter>,
    );
    // the seeded expired cert "old.acme.example" is on acme-issuing-01
    expect(screen.getByRole("link", { name: "old.acme.example" })).toHaveAttribute(
      "href",
      "/nodes/acme-issuing-01/certs/" +
        allCerts().find((c) => c.subjectCn === "old.acme.example")!.serial,
    );
  });

  it("renew creates a new cert and supersedes the old", () => {
    render(
      <MemoryRouter>
        <CertificatesPage />
      </MemoryRouter>,
    );
    const before = allCerts().length;
    const row = screen.getByText("ldap-a.acme.example").closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: /renew/i }));
    expect(allCerts().length).toBe(before + 1);
    expect(
      allCerts().find((c) => c.subjectCn === "ldap-a.acme.example" && c.status === "REVOKED"),
    ).toBeDefined();
  });

  it("search filters to matching certs only", () => {
    render(
      <MemoryRouter>
        <CertificatesPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "ldap-a.acme.example" },
    });
    expect(screen.getByRole("link", { name: "ldap-a.acme.example" })).toBeInTheDocument();
    expect(screen.queryByText("old.acme.example")).not.toBeInTheDocument();
  });
});
