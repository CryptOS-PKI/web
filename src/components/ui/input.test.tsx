import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("renders and forwards typed value", () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} placeholder="search" value="" />);
    const el = screen.getByPlaceholderText("search");
    fireEvent.change(el, { target: { value: "ldap" } });
    expect(onChange).toHaveBeenCalled();
  });
});
