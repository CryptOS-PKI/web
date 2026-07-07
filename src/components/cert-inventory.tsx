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

import { RevokeDialog } from "@/components/revoke-dialog";
import { type CertStatus, useCerts } from "@/lib/certs";
import { cn } from "@/lib/utils";

const statusTone: Record<CertStatus, string> = {
  EXPIRED: "text-muted-foreground",
  REVOKED: "text-destructive",
  VALID: "text-success",
};

type Filter = "ALL" | CertStatus;
const filters: Filter[] = ["ALL", "VALID", "EXPIRED", "REVOKED"];

export const CertInventory = ({ nodeName }: { nodeName: string }) => {
  const certs = useCerts(nodeName);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [revoking, setRevoking] = useState<{ serial: string; subjectCn: string } | null>(null);
  const rows = filter === "ALL" ? certs : certs.filter((c) => c.status === filter);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {filters.map((f) => (
          <button
            className={cn(
              "rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider",
              filter === f
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary",
            )}
            key={f}
            onClick={() => setFilter(f)}
            type="button"
          >
            {f.toLowerCase()}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="font-mono text-sm text-muted-foreground">No certificates.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-secondary text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Serial</th>
                <th className="px-3 py-2">Subject CN</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Expires</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr className="border-t hover:bg-accent" key={c.serial}>
                  <td className="px-3 py-2">
                    <Link
                      className="text-primary hover:underline"
                      to={`/nodes/${nodeName}/certs/${c.serial}`}
                    >
                      {c.serial}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{c.subjectCn}</td>
                  <td className="px-3 py-2">{c.kind === "subordinate-ca" ? "sub-CA" : "leaf"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.notAfter.slice(0, 10)}</td>
                  <td className={cn("px-3 py-2 font-semibold", statusTone[c.status])}>
                    {c.status}
                  </td>
                  <td className="px-3 py-2">
                    {c.status === "REVOKED" ? null : (
                      <button
                        className="text-destructive hover:underline"
                        onClick={() => setRevoking({ serial: c.serial, subjectCn: c.subjectCn })}
                        type="button"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {revoking ? (
        <RevokeDialog
          onClose={() => setRevoking(null)}
          serial={revoking.serial}
          subjectCn={revoking.subjectCn}
        />
      ) : null}
    </div>
  );
};
