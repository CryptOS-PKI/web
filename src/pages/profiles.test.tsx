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

import { __resetProfiles } from "@/lib/profiles";
import { ProfilesPage } from "@/pages/profiles";

describe("ProfilesPage", () => {
  beforeEach(() => __resetProfiles());

  it("lists profiles linking to their detail, plus a New profile link", () => {
    render(
      <MemoryRouter>
        <ProfilesPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /domain controller/i })).toHaveAttribute(
      "href",
      "/profiles/Domain Controller",
    );
    expect(screen.getByRole("link", { name: /new profile/i })).toHaveAttribute(
      "href",
      "/profiles/new",
    );
  });

  it("narrows to RSA-3072 via the Key alg facet, hiding an ECDSA-P384 profile", () => {
    render(
      <MemoryRouter>
        <ProfilesPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /domain controller/i })).toBeInTheDocument();

    const facetToggle = screen
      .getAllByRole("button", { name: /^key alg$/i })
      .find((button) => !button.closest("table"));
    if (!facetToggle) throw new Error("facet toggle not found");
    fireEvent.click(facetToggle);
    const rsaOption = screen.getAllByText("RSA-3072").find((element) => !element.closest("table"));
    if (!rsaOption) throw new Error("RSA-3072 option not found");
    fireEvent.click(rsaOption);

    expect(screen.queryByRole("link", { name: /domain controller/i })).not.toBeInTheDocument();
  });
});
