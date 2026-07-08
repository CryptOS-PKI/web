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
import { describe, expect, it, vi } from "vitest";

import { FacetedFilter } from "./faceted-filter";

const options = [
  { count: 3, label: "VALID", value: "VALID" },
  { count: 1, label: "REVOKED", value: "REVOKED" },
];

describe("FacetedFilter", () => {
  it("opens and toggles a value on", () => {
    const onChange = vi.fn();
    render(<FacetedFilter onChange={onChange} options={options} selected={[]} title="Status" />);
    fireEvent.click(screen.getByRole("button", { name: /status/i }));
    fireEvent.click(screen.getByText("VALID"));
    expect(onChange).toHaveBeenCalledWith(["VALID"]);
  });

  it("toggles a value off when already selected", () => {
    const onChange = vi.fn();
    render(
      <FacetedFilter onChange={onChange} options={options} selected={["VALID"]} title="Status" />,
    );
    fireEvent.click(screen.getByRole("button", { name: /status/i }));
    fireEvent.click(screen.getByText("VALID"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("shows the selected count", () => {
    render(
      <FacetedFilter onChange={vi.fn()} options={options} selected={["VALID"]} title="Status" />,
    );
    expect(screen.getByRole("button", { name: /status/i }).textContent).toContain("1");
  });
});
