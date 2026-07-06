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
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mockNodes, roleLabels } from "@/lib/mock";

export function NodesPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-mono text-2xl font-bold tracking-tight">Nodes</h1>
        <p className="text-sm text-muted-foreground">Every linked node and its identity state.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {mockNodes.map((node, index) => (
            <div key={node.name}>
              {index > 0 ? <Separator /> : null}
              <Link
                to={`/nodes/${node.name}`}
                className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm font-medium">{node.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {roleLabels[node.role]} &middot; {node.address}
                  </div>
                </div>
                <IdentityBadge state={node.identityState} />
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
