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
import { certsFor } from "@/lib/certs";
import { mockNodes, roleLabels } from "@/lib/mock";

// Operational nodes only -- the Root CA has its own surface at /root.
export const NodesPage = () => {
  const nodes = mockNodes.filter((n) => n.role !== "root");

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Nodes</h1>
        <p className="text-sm text-muted-foreground">{nodes.length} operational nodes</p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left font-mono text-sm">
          <thead className="bg-secondary text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Identity</th>
              <th className="px-4 py-2.5">Certs</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {nodes.map((n) => (
              <tr className="border-t hover:bg-accent" key={n.name}>
                <td className="px-4 py-2.5">
                  <Link className="text-primary hover:underline" to={`/nodes/${n.name}`}>
                    {n.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{roleLabels[n.role]}</td>
                <td className="px-4 py-2.5">
                  <IdentityBadge state={n.identityState} />
                </td>
                <td className="px-4 py-2.5">{certsFor(n.name).length}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{"›"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
