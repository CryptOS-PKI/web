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
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { useTableSearchParams } from "./use-table-search-params";

const createWrapper = (initial: string) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  );
  Wrapper.displayName = "MemoryRouterWrapper";
  return Wrapper;
};

const wrapper = (initial: string) => createWrapper(initial);

describe("useTableSearchParams", () => {
  it("falls back to defaults when no params present", () => {
    const { result } = renderHook(
      () => useTableSearchParams("t", 25, [{ desc: false, id: "name" }]),
      {
        wrapper: wrapper("/"),
      },
    );
    expect(result.current.globalFilter).toBe("");
    expect(result.current.sorting).toEqual([{ desc: false, id: "name" }]);
    expect(result.current.pagination).toEqual({ pageIndex: 0, pageSize: 25 });
    expect(result.current.columnFilters).toEqual([]);
  });

  it("hydrates state from namespaced params", () => {
    const { result } = renderHook(() => useTableSearchParams("t", 25, []), {
      wrapper: wrapper("/?t.q=ldap&t.sort=-days&t.page=2&t.status=VALID,EXPIRED"),
    });
    expect(result.current.globalFilter).toBe("ldap");
    expect(result.current.sorting).toEqual([{ desc: true, id: "days" }]);
    expect(result.current.pagination.pageIndex).toBe(1);
    expect(result.current.columnFilters).toEqual([{ id: "status", value: ["VALID", "EXPIRED"] }]);
  });

  it("ignores params from other table keys", () => {
    const { result } = renderHook(() => useTableSearchParams("t", 25, []), {
      wrapper: wrapper("/?other.q=x&other.role=root"),
    });
    expect(result.current.globalFilter).toBe("");
    expect(result.current.columnFilters).toEqual([]);
  });

  it("degrades malformed page to default", () => {
    const { result } = renderHook(() => useTableSearchParams("t", 25, []), {
      wrapper: wrapper("/?t.page=abc"),
    });
    expect(result.current.pagination.pageIndex).toBe(0);
  });

  it("writes search to the url and resets page", () => {
    const { result } = renderHook(() => useTableSearchParams("t", 25, []), {
      wrapper: wrapper("/?t.page=3"),
    });
    act(() => result.current.setGlobalFilter("db"));
    expect(result.current.globalFilter).toBe("db");
    expect(result.current.pagination.pageIndex).toBe(0);
  });

  it("clears a facet when set to empty", () => {
    const { result } = renderHook(() => useTableSearchParams("t", 25, []), {
      wrapper: wrapper("/?t.status=VALID"),
    });
    act(() => result.current.setColumnFilters([]));
    expect(result.current.columnFilters).toEqual([]);
  });

  it("clears ALL facets when set to empty (multi-facet)", () => {
    const { result } = renderHook(() => useTableSearchParams("t", 25, []), {
      wrapper: wrapper("/?t.status=VALID&t.role=root"),
    });
    act(() => result.current.setColumnFilters([]));
    expect(result.current.columnFilters).toEqual([]);
  });
});
