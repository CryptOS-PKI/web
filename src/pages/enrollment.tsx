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

import { Button } from "@/components/ui/button";
import { type EnrollmentStatus, requestEnrollment, useEnrollments } from "@/lib/enrollment";
import { roleLabels } from "@/lib/mock";
import { cn } from "@/lib/utils";

const statusTone: Record<EnrollmentStatus, string> = {
  APPROVED: "text-success",
  PENDING: "text-warning",
  REJECTED: "text-destructive",
};

type Filter = "ALL" | EnrollmentStatus;
const filters: Filter[] = ["PENDING", "APPROVED", "REJECTED", "ALL"];

// A deterministic simulated request (varied by the current count, no RNG).
const simulated = (n: number) => ({
  address: `10.20.1.${100 + n}:8443`,
  attestation: { nodeId: `nid-sim${n}`, tpm: "TPM · sealed" },
  csr: { keyType: "ECDSA P-384", subjectCn: `ACME Issuing CA S${n}` },
  parentCn: "ACME Intermediate CA G1",
  proposedName: `acme-issuing-s${n}`,
  role: "issuing" as const,
});

export const EnrollmentPage = () => {
  const requests = useEnrollments();
  const [filter, setFilter] = useState<Filter>("PENDING");
  const rows = filter === "ALL" ? requests : requests.filter((r) => r.status === filter);
  const pending = requests.filter((r) => r.status === "PENDING").length;

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Enrollment</h1>
          <p className="text-sm text-muted-foreground">{pending} pending join requests</p>
        </div>
        <Button
          onClick={() => requestEnrollment(simulated(requests.length + 1))}
          size="sm"
          variant="outline"
        >
          Simulate incoming request
        </Button>
      </div>

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
        <p className="font-mono text-sm text-muted-foreground">No requests.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left font-mono text-sm">
            <thead className="bg-secondary text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Proposed name</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Parent CA</th>
                <th className="px-4 py-2.5">Requested</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr className="border-t hover:bg-accent" key={r.id}>
                  <td className="px-4 py-2.5">
                    <Link className="text-primary hover:underline" to={`/enrollment/${r.id}`}>
                      {r.proposedName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{roleLabels[r.role]}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.parentCn}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.requestedAt.slice(0, 10)}
                  </td>
                  <td className={cn("px-4 py-2.5 font-semibold", statusTone[r.status])}>
                    {r.status}
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
