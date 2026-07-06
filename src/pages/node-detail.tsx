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

import { IdentityBadge } from "@/components/identity-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getNode, roleLabels } from "@/lib/mock";

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4 font-mono text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export function NodeDetailPage() {
  const { name } = useParams<{ name: string }>();
  const node = name ? getNode(name) : undefined;

  if (!node) {
    return (
      <section className="space-y-4">
        <h1 className="font-mono text-2xl font-bold tracking-tight">Node not found</h1>
        <p className="text-sm text-muted-foreground">
          No linked node named <span className="font-mono">{name}</span>.
        </p>
        <Button variant="outline" asChild>
          <Link to="/nodes">Back to nodes</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-mono text-2xl font-bold tracking-tight">{node.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{roleLabels[node.role]}</p>
        </div>
        <IdentityBadge state={node.identityState} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailRow label="address" value={node.address} />
          <DetailRow label="issuer" value={node.issuer} />
          <DetailRow label="tpm" value={node.tpm} />
          <Separator />
          <DetailRow label="issued" value={node.issued} />
          <DetailRow label="revoked" value={node.revoked} />
        </CardContent>
      </Card>
      <Button variant="outline" asChild>
        <Link to="/nodes">Back to nodes</Link>
      </Button>
    </section>
  );
}
