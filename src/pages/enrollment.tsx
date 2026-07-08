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
import { Button } from "@/components/ui/button";
import {
  type EnrollmentRequest,
  type EnrollmentStatus,
  requestEnrollment,
  useEnrollments,
} from "@/lib/enrollment";
import { roleLabels } from "@/lib/mock";

const STATUS_TONE: Record<EnrollmentStatus, string> = {
  APPROVED: "text-success",
  PENDING: "text-warning",
  REJECTED: "text-destructive",
};

// A deterministic simulated request (varied by the current count, no RNG).
const simulated = (n: number) => ({
  address: `10.20.1.${100 + n}:8443`,
  attestation: { nodeId: `nid-sim${n}`, tpm: "TPM · sealed" },
  csr: { keyType: "ECDSA P-384", subjectCn: `ACME Issuing CA S${n}` },
  parentCn: "ACME Intermediate CA G1",
  proposedName: `acme-issuing-s${n}`,
  role: "issuing" as const,
});

const enrollmentColumns: ColumnDef<EnrollmentRequest, unknown>[] = [
  {
    accessorKey: "proposedName",
    cell: ({ row }) => (
      <Link className="text-primary hover:underline" to={`/enrollment/${row.original.id}`}>
        {row.original.proposedName}
      </Link>
    ),
    header: "Proposed name",
  },
  { accessorFn: (r) => roleLabels[r.role], header: "Role", id: "role" },
  { accessorKey: "parentCn", header: "Parent CA" },
  {
    accessorFn: (r) => r.requestedAt.slice(0, 10),
    header: "Requested",
    id: "requested",
  },
  {
    accessorKey: "status",
    cell: ({ row }) => (
      <span className={STATUS_TONE[row.original.status]}>{row.original.status}</span>
    ),
    header: "Status",
  },
];

export const EnrollmentPage = () => {
  const requests = useEnrollments();
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

      <DataTable
        columns={enrollmentColumns}
        data={requests}
        facets={[
          { columnId: "status", title: "Status" },
          { columnId: "role", title: "Role" },
        ]}
        initialSort={[{ desc: true, id: "requested" }]}
        searchKeys={["proposedName", "parentCn"]}
        tableKey="enroll"
      />
    </section>
  );
};
