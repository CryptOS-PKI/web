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

import { Link } from "react-router-dom";

import { DataTable } from "@/components/data-table/data-table";
import { type EnrollmentAdapter, setEnabled, useAdapters } from "@/lib/adapters";

const protocolColumns: ColumnDef<EnrollmentAdapter, unknown>[] = [
  {
    accessorKey: "name",
    cell: ({ row }) => (
      <Link className="text-primary hover:underline" to={`/protocols/${row.original.kind}`}>
        {row.original.name}
      </Link>
    ),
    header: "Protocol",
  },
  { accessorKey: "endpoint", header: "Endpoint" },
  { accessorKey: "profile", header: "Profile" },
  {
    accessorFn: (a) => (a.enabled ? "enabled" : "disabled"),
    cell: ({ row }) => (
      <span className={row.original.enabled ? "text-success" : "text-muted-foreground"}>
        {row.original.enabled ? "enabled" : "disabled"}
      </span>
    ),
    header: "Enabled",
    id: "enabled",
  },
  {
    cell: ({ row }) => (
      <button
        className="rounded-md border px-2.5 py-1 text-xs hover:bg-secondary"
        onClick={() => setEnabled(row.original.kind, !row.original.enabled)}
        type="button"
      >
        {row.original.enabled ? `Disable ${row.original.kind}` : `Enable ${row.original.kind}`}
      </button>
    ),
    enableSorting: false,
    header: "",
    id: "actions",
  },
];

export const ProtocolsPage = () => {
  const adapters = useAdapters();

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Enrollment protocols</h1>
        <p className="text-sm text-muted-foreground">
          {adapters.filter((a) => a.enabled).length} of {adapters.length} enabled
        </p>
      </div>

      <DataTable
        columns={protocolColumns}
        data={adapters}
        facets={[{ columnId: "enabled", title: "Enabled" }]}
        initialSort={[{ desc: false, id: "name" }]}
        searchKeys={["name", "endpoint"]}
        tableKey="protocols"
      />
    </section>
  );
};
