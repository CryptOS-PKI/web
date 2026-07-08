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

import type { ColumnDef } from "@tanstack/react-table";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table";

type Row = { kind: string; name: string; size: number };

const data: Row[] = [
  { kind: "leaf", name: "alpha", size: 3 },
  { kind: "ca", name: "bravo", size: 1 },
  { kind: "leaf", name: "charlie", size: 2 },
];

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "kind", header: "Kind" },
  { accessorKey: "size", header: "Size" },
];

const renderTable = (over: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) =>
  render(
    <MemoryRouter>
      <DataTable
        columns={columns}
        data={data}
        facets={[{ columnId: "kind", title: "Kind" }]}
        pageSize={2}
        searchKeys={["name"]}
        tableKey="t"
        {...over}
      />
    </MemoryRouter>,
  );

const bodyRowCount = () => within(screen.getByRole("table")).getAllByRole("row").length - 1; // minus header row

describe("DataTable", () => {
  it("renders all rows within the first page", () => {
    renderTable();
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(bodyRowCount()).toBe(2); // pageSize 2
  });

  it("filters by global search", () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "brav" } });
    expect(screen.getByText("bravo")).toBeInTheDocument();
    expect(screen.queryByText("alpha")).not.toBeInTheDocument();
  });

  it("narrows by a faceted filter", () => {
    renderTable();
    const facetToggle = screen
      .getAllByRole("button", { name: /kind/i })
      .find((button) => !button.closest("table"));
    if (!facetToggle) throw new Error("facet toggle not found");
    fireEvent.click(facetToggle);
    const caOption = screen.getAllByText("ca").find((element) => !element.closest("table"));
    if (!caOption) throw new Error("ca option not found");
    fireEvent.click(caOption);
    expect(screen.getByText("bravo")).toBeInTheDocument();
    expect(screen.queryByText("alpha")).not.toBeInTheDocument();
  });

  it("sorts when a header is clicked", () => {
    renderTable({ pageSize: 25 });
    fireEvent.click(screen.getByRole("button", { name: /size/i }));
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("bravo")).toBeInTheDocument(); // size 1 first
  });

  it("paginates and moves to the next page", () => {
    renderTable();
    expect(screen.queryByText("charlie")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("charlie")).toBeInTheDocument();
  });

  it("hides the pager when rows fit one page", () => {
    renderTable({ pageSize: 25 });
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "zzz" } });
    expect(screen.getByText(/no matching rows/i)).toBeInTheDocument();
  });
});
