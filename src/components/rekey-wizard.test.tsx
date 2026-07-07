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
import { describe, expect, it } from "vitest";

import { RekeyWizard } from "@/components/rekey-wizard";
import { getNode } from "@/lib/mock";

describe("RekeyWizard", () => {
  it("advances through the steps to completion", () => {
    render(<RekeyWizard node={getNode("acme-issuing-01")!} />);
    // Four steps: click Next until Done appears.
    for (let i = 0; i < 4; i += 1) {
      const next = screen.queryByRole("button", { name: /next|sign|install|generate/i });
      if (next) fireEvent.click(next);
    }
    expect(screen.getByText(/re-key complete/i)).toBeInTheDocument();
  });
});
