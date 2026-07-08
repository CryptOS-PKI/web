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

import { setEnabled, useAdapters } from "@/lib/adapters";
import { cn } from "@/lib/utils";

export const ProtocolsPage = () => {
  const adapters = useAdapters();

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Enrollment protocols</h1>
        <p className="text-sm text-muted-foreground">
          {adapters.filter((a) => a.enabled).length} of {adapters.length} enabled
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left font-mono text-sm">
          <thead className="bg-secondary text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Protocol</th>
              <th className="px-4 py-2.5">Endpoint</th>
              <th className="px-4 py-2.5">Profile</th>
              <th className="px-4 py-2.5">Enabled</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {adapters.map((a) => (
              <tr className="border-t hover:bg-accent" key={a.kind}>
                <td className="px-4 py-2.5">
                  <Link className="text-primary hover:underline" to={`/protocols/${a.kind}`}>
                    {a.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{a.endpoint}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{a.profile}</td>
                <td
                  className={cn(
                    "px-4 py-2.5 font-semibold",
                    a.enabled ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {a.enabled ? "enabled" : "disabled"}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    className="rounded-md border px-2.5 py-1 text-xs hover:bg-secondary"
                    onClick={() => setEnabled(a.kind, !a.enabled)}
                    type="button"
                  >
                    {a.enabled ? `Disable ${a.kind}` : `Enable ${a.kind}`}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
