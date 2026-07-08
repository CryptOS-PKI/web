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

import type { ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const RESERVED = new Set(["page", "q", "sort"]);

export const useTableSearchParams = (
  tableKey: string,
  pageSize: number,
  initialSort: SortingState,
) => {
  const [params, setParams] = useSearchParams();
  const key = useMemo(() => (k: string) => `${tableKey}.${k}`, [tableKey]);

  const globalFilter = params.get(key("q")) ?? "";

  const sortRaw = params.get(key("sort"));
  const sorting: SortingState = sortRaw
    ? [{ desc: sortRaw.startsWith("-"), id: sortRaw.replace(/^-/, "") }]
    : initialSort;

  const pageRaw = Number(params.get(key("page")));
  const pageIndex = Number.isInteger(pageRaw) && pageRaw > 1 ? pageRaw - 1 : 0;
  const pagination: PaginationState = { pageIndex, pageSize };

  const columnFilters: ColumnFiltersState = [];
  for (const [k, value] of params.entries()) {
    if (!k.startsWith(`${tableKey}.`)) continue;
    const col = k.slice(tableKey.length + 1);
    if (RESERVED.has(col) || !value) continue;
    columnFilters.push({ id: col, value: value.split(",") });
  }

  const mutate = useCallback(
    (fn: (next: URLSearchParams) => void) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          fn(next);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setGlobalFilter = useCallback(
    (v: string) =>
      mutate((n) => {
        if (v) n.set(key("q"), v);
        else n.delete(key("q"));
        n.delete(key("page"));
      }),
    [mutate, key],
  );

  const setSorting = useCallback(
    (s: SortingState) =>
      mutate((n) => {
        if (s.length > 0) n.set(key("sort"), `${s[0].desc ? "-" : ""}${s[0].id}`);
        else n.delete(key("sort"));
        n.delete(key("page"));
      }),
    [mutate, key],
  );

  const setPagination = useCallback(
    (p: PaginationState) =>
      mutate((n) => {
        if (p.pageIndex > 0) n.set(key("page"), String(p.pageIndex + 1));
        else n.delete(key("page"));
      }),
    [mutate, key],
  );

  const setColumnFilters = useCallback(
    (filters: ColumnFiltersState) =>
      mutate((n) => {
        // eslint-disable-next-line unicorn/prefer-spread
        for (const k of Array.from(n.keys())) {
          const col = k.slice(tableKey.length + 1);
          if (k.startsWith(`${tableKey}.`) && !RESERVED.has(col)) n.delete(k);
        }
        for (const f of filters) {
          const vals = f.value as string[];
          if (vals && vals.length > 0) n.set(key(f.id), vals.join(","));
        }
        n.delete(key("page"));
      }),
    [mutate, key, tableKey],
  );

  return {
    columnFilters,
    globalFilter,
    pagination,
    setColumnFilters,
    setGlobalFilter,
    setPagination,
    setSorting,
    sorting,
  };
};
