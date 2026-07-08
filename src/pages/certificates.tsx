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

import { type Cert, daysUntilExpiry, expiryClass, renewCert, useAllCerts } from "@/lib/certs";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  expired: "text-destructive",
  expiring: "text-warning",
  ok: "text-success",
};

const tone = (c: Cert): string => {
  if (c.status === "REVOKED") return "text-muted-foreground";
  return TONE[expiryClass(c)] ?? "text-muted-foreground";
};

const daysLabel = (c: Cert): string => {
  if (c.status === "REVOKED") return "\u2014";
  const d = daysUntilExpiry(c);
  return d < 0 ? `expired ${-d}d ago` : `${d}d`;
};

export const CertificatesPage = () => {
  // eslint-disable-next-line unicorn/no-array-sort
  const certs = [...useAllCerts()].sort((a, b) => daysUntilExpiry(a) - daysUntilExpiry(b));

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          {certs.length} certificates across the fleet
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-secondary text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Subject CN</th>
              <th className="px-3 py-2">Issuer node</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Profile</th>
              <th className="px-3 py-2">Expires</th>
              <th className="px-3 py-2">Days left</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {certs.map((c) => (
              <tr className="border-t hover:bg-accent" key={c.serial}>
                <td className="px-3 py-2">
                  <Link
                    className="text-primary hover:underline"
                    to={`/nodes/${c.issuerNodeName}/certs/${c.serial}`}
                  >
                    {c.subjectCn}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{c.issuerNodeName}</td>
                <td className="px-3 py-2">{c.kind === "subordinate-ca" ? "sub-CA" : "leaf"}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.profile ?? "\u2014"}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.notAfter.slice(0, 10)}</td>
                <td className={cn("px-3 py-2 font-semibold", tone(c))}>{daysLabel(c)}</td>
                <td className={cn("px-3 py-2 font-semibold", tone(c))}>{c.status}</td>
                <td className="px-3 py-2">
                  {c.status === "REVOKED" ? null : (
                    <button
                      className="rounded-md border px-2.5 py-1 text-[11px] hover:bg-secondary"
                      onClick={() => renewCert(c.serial)}
                      type="button"
                    >
                      Renew
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
