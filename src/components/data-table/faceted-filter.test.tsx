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
