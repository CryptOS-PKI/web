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

import { useState } from "react";
import { Link } from "react-router-dom";

import { type AuditKind, useAudit } from "@/lib/audit";
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

const KINDS: ("all" | AuditKind)[] = [
  "all",
  "issued",
  "renewed",
  "revoked",
  "enroll-approved",
  "enroll-rejected",
  "protocol-toggled",
  "config-applied",
  "rekeyed",
  "profile-created",
  "profile-updated",
];

export const AuditPage = () => {
  const events = useAudit();
  const [filter, setFilter] = useState<"all" | AuditKind>("all");
  const rows = filter === "all" ? events : events.filter((e) => e.kind === filter);

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="font-mono text-2xl font-bold tracking-tight">Audit</h1>
        <p className="text-sm text-muted-foreground">{events.length} recorded events</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            className={cn(
              "rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider",
              filter === k
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary",
            )}
            key={k}
            onClick={() => setFilter(k)}
            type="button"
          >
            {k.replaceAll("-", " ")}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="font-mono text-sm text-muted-foreground">No events.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-secondary text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Event</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr className="border-t hover:bg-accent" key={e.id}>
                  <td className="px-3 py-2 text-muted-foreground">{e.at.slice(0, 10)}</td>
                  <td className={cn("px-3 py-2 font-semibold", KIND_TONE[e.kind])}>
                    {e.kind.replaceAll("-", " ")}
                  </td>
                  <td className="px-3 py-2">
                    {e.targetPath ? (
                      <Link className="text-primary hover:underline" to={e.targetPath}>
                        {e.summary}
                      </Link>
                    ) : (
                      e.summary
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
