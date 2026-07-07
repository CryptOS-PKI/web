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

import { Link, useParams } from "react-router-dom";

import { CertInventory } from "@/components/cert-inventory";
import { NodeDetailPanel } from "@/components/node-detail-panel";
import { Button } from "@/components/ui/button";
import { roleLabels } from "@/lib/mock";
import { getNode } from "@/lib/nodes";

export const NodeDetailPage = () => {
  const { name } = useParams<{ name: string }>();
  const node = name ? getNode(name) : undefined;

  if (!node) {
    return (
      <section className="space-y-4">
        <h1 className="font-mono text-2xl font-bold tracking-tight">Node not found</h1>
        <p className="text-sm text-muted-foreground">
          No linked node named <span className="font-mono">{name}</span>.
        </p>
        <Button asChild variant="outline">
          <Link to="/nodes">Back to nodes</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{node.name}</h1>
        <p className="font-mono text-sm text-muted-foreground">{roleLabels[node.role]}</p>
      </div>
      <div className="w-full rounded-xl border bg-card">
        <NodeDetailPanel node={node} />
      </div>
      <div className="w-full rounded-xl border bg-card">
        <div className="border-b px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          Certificates
        </div>
        <div className="p-4">
          <CertInventory nodeName={node.name} />
        </div>
      </div>
      <Button asChild variant="outline">
        <Link to="/nodes">Back to nodes</Link>
      </Button>
    </section>
  );
};
