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
import { type AuditEvent, type AuditKind, useAudit } from "@/lib/audit";
import { cn } from "@/lib/utils";

const KIND_TONE: Record<AuditKind, string> = {
  "config-applied": "text-muted-foreground",
  "enroll-approved": "text-success",
  "enroll-rejected": "text-destructive",
  issued: "text-success",
  "profile-created": "text-muted-foreground",
  "profile-updated": "text-muted-foreground",
  "protocol-toggled": "text-muted-foreground",
  rekeyed: "text-primary",
  renewed: "text-primary",
  revoked: "text-destructive",
};

const auditColumns: ColumnDef<AuditEvent, unknown>[] = [
  { accessorFn: (e) => e.at.slice(0, 10), header: "Time", id: "time" },
  {
    accessorKey: "kind",
    cell: ({ row }) => (
      <span className={cn("font-semibold", KIND_TONE[row.original.kind])}>
        {row.original.kind.replaceAll("-", " ")}
      </span>
    ),
    header: "Kind",
  },
  { accessorFn: (e) => e.targetKind ?? "\u2014", header: "Target", id: "targetKind" },
  {
    accessorKey: "summary",
    cell: ({ row }) =>
      row.original.targetPath ? (
        <Link className="text-primary hover:underline" to={row.original.targetPath}>
          {row.original.summary}
        </Link>
      ) : (
        row.original.summary
      ),
    header: "Event",
  },
];

export const AuditPage = () => {
  const events = useAudit();

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="font-mono text-2xl font-bold tracking-tight">Audit</h1>
        <p className="text-sm text-muted-foreground">{events.length} recorded events</p>
      </div>

      <DataTable
        columns={auditColumns}
        data={events}
        facets={[
          { columnId: "kind", optionLabel: (v) => v.replaceAll("-", " "), title: "Kind" },
          { columnId: "targetKind", title: "Target" },
        ]}
        initialSort={[]}
        searchKeys={["summary"]}
      />
    </section>
  );
};
