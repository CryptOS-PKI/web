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

import type { ColumnDef, ColumnFiltersState, FilterFn, SortingState } from "@tanstack/react-table";

import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";

import { Input } from "@/components/ui/input";

import { ColumnHeader } from "./column-header";
import { FacetedFilter } from "./faceted-filter";
import { Pagination } from "./pagination";
import { useTableSearchParams } from "./use-table-search-params";

export type FacetConfig = {
  columnId: string;
  optionLabel?: (value: string) => string;
  title: string;
};

const facetFilterFn: FilterFn<unknown> = (row, columnId, value) =>
  !Array.isArray(value) || value.length === 0 || value.includes(String(row.getValue(columnId)));

const columnId = (col: ColumnDef<unknown, unknown>) =>
  col.id ?? ("accessorKey" in col ? String(col.accessorKey) : "");

export const DataTable = <T,>({
  columns,
  data,
  facets = [],
  initialSort = [],
  pageSize = 25,
  searchKeys = [],
  searchPlaceholder = "search...",
  tableKey,
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  facets?: FacetConfig[];
  initialSort?: SortingState;
  pageSize?: number;
  searchKeys?: string[];
  searchPlaceholder?: string;
  tableKey: string;
}) => {
  const url = useTableSearchParams(tableKey, pageSize, initialSort);

  const facetIds = useMemo(() => new Set(facets.map((f) => f.columnId)), [facets]);
  const searchSet = useMemo(() => new Set(searchKeys), [searchKeys]);

  const preparedColumns = useMemo(
    () =>
      columns.map((col) => {
        const id = columnId(col as ColumnDef<unknown, unknown>);
        return {
          ...col,
          enableGlobalFilter: searchSet.has(id),
          ...(facetIds.has(id) ? { filterFn: facetFilterFn } : {}),
        } as ColumnDef<T, unknown>;
      }),
    [columns, facetIds, searchSet],
  );

  const table = useReactTable({
    columns: preparedColumns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: "includesString",
    onColumnFiltersChange: (updater) =>
      url.setColumnFilters(
        typeof updater === "function"
          ? (updater(url.columnFilters) as ColumnFiltersState)
          : updater,
      ),
    onGlobalFilterChange: (updater) =>
      url.setGlobalFilter(
        typeof updater === "function" ? (updater(url.globalFilter) as string) : updater,
      ),
    onPaginationChange: (updater) =>
      url.setPagination(typeof updater === "function" ? updater(url.pagination) : updater),
    onSortingChange: (updater) =>
      url.setSorting(typeof updater === "function" ? updater(url.sorting) : updater),
    sortDescFirst: false,
    state: {
      columnFilters: url.columnFilters,
      globalFilter: url.globalFilter,
      pagination: url.pagination,
      sorting: url.sorting,
    },
  });

  const rows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const colCount = table.getAllLeafColumns().length;

  return (
    <div className="space-y-3">
      {(searchKeys.length > 0 || facets.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchKeys.length > 0 && (
            <Input
              className="max-w-56"
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              value={url.globalFilter}
            />
          )}
          {facets.map((f) => {
            const column = table.getColumn(f.columnId);
            if (!column) return null;
            // Options list every distinct value in the column across ALL rows
            // (the unfiltered core model), never just the cross-filtered subset,
            // so an active filter on one facet can't hide selectable values in
            // another. Counts are totals.
            const counts = new Map<string, number>();
            for (const row of table.getCoreRowModel().flatRows) {
              const raw = row.getValue(f.columnId);
              if (raw == null || raw === "") continue;
              const value = String(raw);
              counts.set(value, (counts.get(value) ?? 0) + 1);
            }
            const options = [...counts.entries()]
              // eslint-disable-next-line unicorn/no-array-sort
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([value, count]) => ({
                count,
                label: f.optionLabel ? f.optionLabel(value) : value,
                value,
              }));
            return (
              <FacetedFilter
                key={f.columnId}
                onChange={(values) => column.setFilterValue(values.length > 0 ? values : undefined)}
                options={options}
                selected={(column.getFilterValue() as string[]) ?? []}
                title={f.title}
              />
            );
          })}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-secondary text-[10.5px] uppercase tracking-wider text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  // eslint-disable-next-line unicorn/no-nested-ternary
                  const headerCell = h.isPlaceholder ? null : h.column.getCanSort() ? (
                    <ColumnHeader column={h.column} title={String(h.column.columnDef.header)} />
                  ) : (
                    flexRender(h.column.columnDef.header, h.getContext())
                  );
                  return (
                    <th className="px-3 py-2" key={h.id}>
                      {headerCell}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={colCount}>
                  No matching rows.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr className="border-t hover:bg-accent" key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td className="px-3 py-2" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalFiltered > pageSize && <Pagination table={table} />}
    </div>
  );
};
