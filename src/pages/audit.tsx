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
import { Card, CardContent } from "@/components/ui/card";

export const AuditPage = () => {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-mono text-2xl font-bold tracking-tight">Audit</h1>
        <p className="text-sm text-muted-foreground">
          The tamper-evident audit log tail lands here once the manager backend is wired.
        </p>
      </div>
      <Card>
        <CardContent className="p-10 text-center font-mono text-sm text-muted-foreground">
          No audit records yet.
        </CardContent>
      </Card>
    </section>
  );
};
