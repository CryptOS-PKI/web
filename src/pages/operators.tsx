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

import { useCallback, useEffect, useState } from "react";

import { OperatorIssueDialog } from "@/components/operator-issue-dialog";
import { OperatorRevokeDialog } from "@/components/operator-revoke-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";
import { listOperatorCredentials, type OperatorCredentialRow } from "@/lib/operators";

const th =
  "px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground";
const td = "px-3 py-2 font-mono text-xs";

// OperatorsPage is the admin surface for operator credential lifecycle (S9):
// it lists issued credentials and offers issue (browser key + CSR -> manager
// signs -> sealed PKCS#12 download) and revoke (which the manager then enforces
// in its authz middleware). Reads are operator-readable; the issue/revoke
// actions are admin-only here, and the server enforces the gate too.
export const OperatorsPage = () => {
  const { operator } = useAuth();
  const isAdmin = operator?.level === "admin";

  const [rows, setRows] = useState<OperatorCredentialRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [showIssue, setShowIssue] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<null | OperatorCredentialRow>(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setRows(await listOperatorCredentials());
    } catch (error_: unknown) {
      setLoadError(error_ instanceof Error ? error_.message : "Failed to load credentials");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Operators</h1>
          <p className="text-sm text-muted-foreground">
            {rows.filter((r) => !r.revoked).length} active of {rows.length} operator credentials
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setShowIssue(true)} size="sm">
            {"Issue operator…"}
          </Button>
        ) : null}
      </div>

      <p
        className="max-w-3xl rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-muted-foreground"
        role="note"
      >
        Operator credentials are signed by the operator-CA node. Revoking one takes effect
        fleet-wide: the manager denies the revoked certificate at its authorization layer.
      </p>

      {loadError ? (
        <p className="font-mono text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="w-full overflow-hidden rounded-xl border bg-card">
        <table className="w-full border-collapse">
          <thead className="border-b bg-secondary/50">
            <tr>
              <th className={th}>Common name</th>
              <th className={th}>Level</th>
              <th className={th}>Serial</th>
              <th className={th}>Expiry</th>
              <th className={th}>Status</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-muted-foreground" colSpan={6}>
                  No operator credentials.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr className="border-b last:border-0" key={r.serialHex}>
                  <td className={`${td} font-semibold`}>{r.commonName}</td>
                  <td className={td}>{r.level}</td>
                  <td className={`${td} break-all`}>{r.serialHex}</td>
                  <td className={td}>{r.notAfter}</td>
                  <td className={td}>
                    {r.revoked ? (
                      <span className="text-destructive">revoked</span>
                    ) : (
                      <span className="text-success">active</span>
                    )}
                  </td>
                  <td className={`${td} text-right`}>
                    {isAdmin && !r.revoked ? (
                      <button
                        className="rounded-md border px-2.5 py-1 text-xs hover:bg-secondary"
                        onClick={() => setRevokeTarget(r)}
                        type="button"
                      >
                        {"Revoke…"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showIssue ? (
        <OperatorIssueDialog onClose={() => setShowIssue(false)} onIssued={() => void load()} />
      ) : null}
      {revokeTarget ? (
        <OperatorRevokeDialog
          commonName={revokeTarget.commonName}
          onClose={() => setRevokeTarget(null)}
          onRevoked={() => void load()}
          serialHex={revokeTarget.serialHex}
        />
      ) : null}
    </section>
  );
};
