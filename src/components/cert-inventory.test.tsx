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

import { CertInventory } from "@/components/cert-inventory";
import { __resetCerts, certsFor } from "@/lib/certs";

describe("CertInventory", () => {
  beforeEach(() => __resetCerts());

  it("lists the CA's certs by subject CN", () => {
    render(
      <MemoryRouter>
        <CertInventory nodeName="acme-issuing-01" />
      </MemoryRouter>,
    );
    const first = certsFor("acme-issuing-01")[0];
    expect(screen.getByText(first.subjectCn)).toBeInTheDocument();
  });

  it("filters to revoked only", () => {
    render(
      <MemoryRouter>
        <CertInventory nodeName="acme-issuing-01" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /revoked/i }));
    const valid = certsFor("acme-issuing-01").find((c) => c.status === "VALID");
    expect(valid && screen.queryByText(valid.subjectCn)).not.toBeInTheDocument();
  });
});
