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
import { Link } from "react-router-dom";

import { IdentityBadge } from "@/components/identity-badge";
import { Button } from "@/components/ui/button";
import { roleLabels, type Node } from "@/lib/mock";

// A single labeled field cell in the detail grid.
const Field = ({
  label,
  children,
  mono = true,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) => {
  return (
    <div className="flex flex-col items-start gap-1 rounded-lg border bg-secondary px-3 py-2.5">
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={mono ? "font-mono text-xs" : "text-sm"}>{children}</span>
    </div>
  );
};

const fleetManagerText = (node: Node): string => {
  const fm = node.fleetManager;
  if (!fm.linked) return `REVOKED · ${fm.note ?? "peer cert pulled"}`;
  if (fm.peerCertDays !== undefined) return `LINKED · peer cert ${fm.peerCertDays}d`;
  return "LINKED";
};

export const NodeDetailPanel = ({ node }: { node: Node }) => {
  const established = node.identityState === "ESTABLISHED";
  const hasEndpoints = Boolean(node.crl && node.ocsp);

  return (
    <div className="p-4">
      <div className="text-lg font-bold">{node.name}</div>
      <div className="mt-0.5 font-mono text-xs text-muted-foreground">
        {node.address} · {roleLabels[node.role]}
      </div>

      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
        <Field label="identity" mono={false}>
          <IdentityBadge state={node.identityState} />
        </Field>
        <Field label="issuer">{node.issuer}</Field>
        <Field label="subject cn">{node.cn}</Field>
        <Field label="issued / revoked">
          {node.issued} / {node.revoked}
        </Field>
        <Field label="tpm">{node.tpm}</Field>
        <Field label="fleet manager">{fleetManagerText(node)}</Field>
        <Field label="boot count">{node.bootCount}</Field>
        <Field label="uptime">{node.uptime}</Field>
        {hasEndpoints ? (
          <>
            <Field label="crl">
              <span className="text-primary">{node.crl}</span>
            </Field>
            <Field label="ocsp">
              <span className="text-primary">{node.ocsp}</span>
            </Field>
          </>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" disabled={!established}>
          Issue leaf
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/nodes/${node.name}`}>View chain</Link>
        </Button>
        <Button size="sm" variant="outline" disabled={node.revoked === 0}>
          Revocations
        </Button>
        <Button size="sm" variant="destructive" disabled={node.identityState === "REVOKED"}>
          Revoke…
        </Button>
      </div>
    </div>
  );
};
