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

import { Button } from "@/components/ui/button";
import { canIssue, type Cert, type CertKind, issueCert } from "@/lib/certs";
import { type Node } from "@/lib/mock";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-md border bg-card px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export const IssueForm = ({ node, onIssued }: { node: Node; onIssued: (cert: Cert) => void }) => {
  const kinds = canIssue(node);
  const [kind, setKind] = useState<CertKind>(kinds[0]);
  const [subjectCn, setSubjectCn] = useState("");
  const [sans, setSans] = useState("");
  const [pathLen, setPathLen] = useState("0");
  const [validityDays, setValidityDays] = useState("90");
  const [error, setError] = useState("");

  const submit = () => {
    if (!subjectCn.trim()) {
      setError("Subject CN is required.");
      return;
    }
    const cert = issueCert(node.name, {
      eku: kind === "leaf" ? ["serverAuth"] : [],
      kind,
      pathLen: kind === "subordinate-ca" ? Number(pathLen) : undefined,
      sans: sans
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      subjectCn: subjectCn.trim(),
      validityDays: Number(validityDays),
    });
    onIssued(cert);
  };

  return (
    <div className="max-w-md space-y-4">
      {kinds.length > 1 ? (
        <div className="flex gap-1.5">
          {kinds.map((k) => (
            <button
              className={cn(
                "rounded-md border px-3 py-1.5 font-mono text-xs",
                kind === k
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary",
              )}
              key={k}
              onClick={() => setKind(k)}
              type="button"
            >
              {k === "subordinate-ca" ? "Subordinate CA" : "Leaf"}
            </button>
          ))}
        </div>
      ) : null}

      <label className="block space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Subject CN
        </span>
        <input className={field} onChange={(e) => setSubjectCn(e.target.value)} value={subjectCn} />
      </label>

      {kind === "leaf" ? (
        <label className="block space-y-1">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            SANs (comma-separated)
          </span>
          <input className={field} onChange={(e) => setSans(e.target.value)} value={sans} />
        </label>
      ) : (
        <label className="block space-y-1">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Path length
          </span>
          <input
            className={field}
            onChange={(e) => setPathLen(e.target.value)}
            type="number"
            value={pathLen}
          />
        </label>
      )}

      <label className="block space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Validity (days)
        </span>
        <input
          className={field}
          onChange={(e) => setValidityDays(e.target.value)}
          type="number"
          value={validityDays}
        />
      </label>

      {error ? <p className="font-mono text-xs text-destructive">{error}</p> : null}
      <Button onClick={submit} type="button">
        Issue
      </Button>
    </div>
  );
};
