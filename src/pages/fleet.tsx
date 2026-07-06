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

import { FleetTopology } from "@/components/fleet-topology";
import { NodeDetailPanel } from "@/components/node-detail-panel";
import { getNode, mockNodes } from "@/lib/mock";

function PanelHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex gap-3 font-mono text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <i className="h-2 w-2 rounded-full bg-success" />
        Established
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="h-2 w-2 rounded-full bg-warning" />
        Pending
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="h-2 w-2 rounded-full bg-destructive" />
        Revoked
      </span>
    </div>
  );
}

// The default selection is the first established intermediate, matching the
// reference (ACME Intermediate CA G1). Falls back to the first node.
const defaultSelected =
  mockNodes.find((n) => n.role === "intermediate" && n.identityState === "ESTABLISHED")?.name ??
  mockNodes[0].name;

export function FleetPage() {
  const [selected, setSelected] = useState(defaultSelected);
  const rootCount = mockNodes.filter((n) => n.role === "root").length;
  const node = getNode(selected) ?? mockNodes[0];

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Fleet</h1>
        <p className="text-sm text-muted-foreground">
          {rootCount} Root · {mockNodes.length} nodes · large groups collapse — click to expand
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <div className="w-full rounded-xl border bg-card">
          <PanelHeader label="Topology">
            <Legend />
          </PanelHeader>
          <FleetTopology selected={selected} onSelect={setSelected} />
        </div>

        <div className="w-full rounded-xl border bg-card">
          <PanelHeader label={`Node · ${node.name}`} />
          <NodeDetailPanel node={node} />
        </div>
      </div>
    </section>
  );
}
