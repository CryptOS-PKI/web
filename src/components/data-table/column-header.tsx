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

import type { Column } from "@tanstack/react-table";

export const ColumnHeader = <T,>({
  column,
  title,
}: {
  column: Column<T, unknown>;
  title: string;
}) => {
  const sorted = column.getIsSorted();
  // eslint-disable-next-line unicorn/no-nested-ternary
  const caret = sorted === "asc" ? "\u25B2" : sorted === "desc" ? "\u25BC" : "\u2195";
  return (
    <button
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={column.getToggleSortingHandler()}
      type="button"
    >
      {title}
      <span aria-hidden className="text-[9px] opacity-60">
        {caret}
      </span>
    </button>
  );
};
