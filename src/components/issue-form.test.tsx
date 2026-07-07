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
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IssueForm } from "@/components/issue-form";
import { __resetCerts } from "@/lib/certs";
import { getNode } from "@/lib/nodes";
import { __resetProfiles } from "@/lib/profiles";

describe("IssueForm profile picker", () => {
  beforeEach(() => {
    __resetCerts();
    __resetProfiles();
  });

  it("applies a selected profile and records it on the issued cert", () => {
    const onIssued = vi.fn();
    render(<IssueForm node={getNode("acme-issuing-01")!} onIssued={onIssued} />);
    fireEvent.change(screen.getByLabelText(/profile/i), {
      target: { value: "TLS Server (LDAPS)" },
    });
    fireEvent.change(screen.getByLabelText(/subject cn/i), {
      target: { value: "ldap.acme.example" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^issue$/i }));
    expect(onIssued).toHaveBeenCalledWith(
      expect.objectContaining({ eku: ["server_auth"], profile: "TLS Server (LDAPS)" }),
    );
  });
});
