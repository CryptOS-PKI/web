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

import { Link, Navigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { setEnabled, updateAdapter, useAdapters } from "@/lib/adapters";
import { useProfiles } from "@/lib/profiles";

const field = "w-full rounded-md border bg-card px-3 py-2 font-mono text-sm";

export const ProtocolDetailPage = () => {
  const { kind } = useParams<{ kind: string }>();
  const adapters = useAdapters();
  const profiles = useProfiles();
  const adapter = adapters.find((a) => a.kind === kind);

  if (!adapter) {
    return <Navigate replace to="/protocols" />;
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{adapter.name}</h1>
        <p className="font-mono text-sm text-muted-foreground">Enrollment protocol adapter</p>
      </div>

      <label className="flex items-center gap-2 font-mono text-sm">
        <input
          checked={adapter.enabled}
          onChange={(e) => setEnabled(adapter.kind, e.target.checked)}
          type="checkbox"
        />
        Enabled
      </label>

      <label className="block max-w-md space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Bound profile
        </span>
        <select
          className={field}
          onChange={(e) => updateAdapter(adapter.kind, { profile: e.target.value })}
          value={adapter.profile}
        >
          {profiles.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block max-w-md space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Endpoint
        </span>
        <input
          className={field}
          onChange={(e) => updateAdapter(adapter.kind, { endpoint: e.target.value })}
          value={adapter.endpoint}
        />
      </label>

      {adapter.kind === "acme" ? (
        <div className="max-w-md space-y-1">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            ACME challenges
          </span>
          <div className="flex gap-2">
            {["http-01", "dns-01"].map((c) => (
              <label className="flex items-center gap-1.5 font-mono text-xs" key={c}>
                <input
                  checked={(adapter.challenges ?? []).includes(c)}
                  onChange={(e) => {
                    const cur = adapter.challenges ?? [];
                    updateAdapter(adapter.kind, {
                      challenges: e.target.checked ? [...cur, c] : cur.filter((x) => x !== c),
                    });
                  }}
                  type="checkbox"
                />
                {c}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {adapter.kind === "ms-autoenroll" ? (
        <label className="block max-w-md space-y-1">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            GPO template
          </span>
          <input
            className={field}
            onChange={(e) => updateAdapter(adapter.kind, { gpoTemplate: e.target.value })}
            value={adapter.gpoTemplate ?? ""}
          />
        </label>
      ) : null}

      <Button asChild variant="outline">
        <Link to="/protocols">Back to protocols</Link>
      </Button>
    </section>
  );
};
