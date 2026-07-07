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
import { Link, Navigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  approveEnrollment,
  canApprove,
  getEnrollment,
  rejectEnrollment,
  useEnrollments,
} from "@/lib/enrollment";
import { roleLabels } from "@/lib/mock";

const Field = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className="flex flex-col gap-1 rounded-lg border bg-secondary px-3 py-2.5">
    <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
    <span className="break-all font-mono text-xs">{children}</span>
  </div>
);

export const EnrollmentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  useEnrollments(); // subscribe so approve/reject re-render this page
  const req = id ? getEnrollment(id) : undefined;
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  if (!req) {
    return <Navigate replace to="/enrollment" />;
  }

  const approvable = canApprove(req);

  let statusBlock: React.ReactNode;
  if (req.status === "PENDING") {
    statusBlock = (
      <div className="space-y-3">
        {approvable.ok ? null : (
          <p className="font-mono text-xs text-destructive">{approvable.reason}</p>
        )}
        <div className="flex gap-2">
          <Button disabled={!approvable.ok} onClick={() => approveEnrollment(req.id)} size="sm">
            Approve
          </Button>
          <Button onClick={() => setRejecting(true)} size="sm" variant="destructive">
            Reject
          </Button>
        </div>
      </div>
    );
  } else if (req.status === "APPROVED") {
    statusBlock = (
      <p className="font-mono text-sm">
        Approved. Node{" "}
        <Link className="text-primary hover:underline" to={`/nodes/${req.admittedNodeName}`}>
          {req.admittedNodeName}
        </Link>{" "}
        joined the fleet.
      </p>
    );
  } else {
    statusBlock = (
      <p className="font-mono text-sm text-destructive">Rejected: {req.rejectionReason}</p>
    );
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{req.proposedName}</h1>
        <p className="font-mono text-sm text-muted-foreground">
          {roleLabels[req.role]} &middot; requesting to join under {req.parentCn}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="proposed name">{req.proposedName}</Field>
        <Field label="role">{roleLabels[req.role]}</Field>
        <Field label="parent ca">{req.parentCn}</Field>
        <Field label="address">{req.address}</Field>
        <Field label="tpm attestation">{req.attestation.tpm}</Field>
        <Field label="node id">{req.attestation.nodeId}</Field>
        <Field label="csr subject cn">{req.csr.subjectCn}</Field>
        <Field label="key type">{req.csr.keyType}</Field>
        <Field label="requested">{req.requestedAt.slice(0, 10)}</Field>
        <Field label="status">{req.status}</Field>
      </div>

      {statusBlock}

      <Button asChild variant="outline">
        <Link to="/enrollment">Back to enrollment</Link>
      </Button>

      {rejecting ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setRejecting(false)}
          role="presentation"
        >
          <div
            aria-labelledby="reject-title"
            aria-modal="true"
            className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h2 className="text-lg font-bold" id="reject-title">
              Reject request
            </h2>
            <label className="block space-y-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Reason
              </span>
              <input
                className="w-full rounded-md border bg-card px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => setReason(e.target.value)}
                value={reason}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setRejecting(false)} size="sm" variant="outline">
                Cancel
              </Button>
              <Button
                disabled={!reason.trim()}
                onClick={() => {
                  rejectEnrollment(req.id, reason.trim());
                  setRejecting(false);
                }}
                size="sm"
                variant="destructive"
              >
                Confirm reject
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
