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

import { Button } from "@/components/ui/button";
import { useProfiles } from "@/lib/profiles";

export const ProfilesPage = () => {
  const profiles = useProfiles();

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Certificate profiles</h1>
          <p className="text-sm text-muted-foreground">{profiles.length} templates</p>
        </div>
        <Button asChild size="sm">
          <Link to="/profiles/new">New profile</Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left font-mono text-sm">
          <thead className="bg-secondary text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Key alg</th>
              <th className="px-4 py-2.5">Validity</th>
              <th className="px-4 py-2.5">CA</th>
              <th className="px-4 py-2.5">Ext key usage</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr className="border-t hover:bg-accent" key={p.name}>
                <td className="px-4 py-2.5">
                  <Link className="text-primary hover:underline" to={`/profiles/${p.name}`}>
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{p.keyAlg}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{p.validityDays}d</td>
                <td className="px-4 py-2.5 text-muted-foreground">{p.isCA ? "yes" : "no"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {p.extKeyUsage.join(", ") || "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
