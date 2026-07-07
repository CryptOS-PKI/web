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

import { Button } from "@/components/ui/button";
import { type Node } from "@/lib/mock";
import { cn } from "@/lib/utils";

const stepClass = (i: number, current: number): string => {
  if (i < current) return "text-success";
  if (i === current) return "text-foreground";
  return "text-muted-foreground";
};

export const RekeyWizard = ({ node }: { node: Node }) => {
  const isRoot = node.role === "root";
  const steps = isRoot
    ? ["Generate new key", "Self-sign new certificate", "Install new identity"]
    : ["Generate new key", "Generate CSR", "Parent signs", "Install new identity"];
  const [current, setCurrent] = useState(0);
  const done = current >= steps.length;

  return (
    <div className="max-w-md space-y-4">
      <ol className="space-y-2">
        {steps.map((label, i) => (
          <li
            className={cn("flex items-center gap-2 font-mono text-sm", stepClass(i, current))}
            key={label}
          >
            <span className="inline-flex size-5 items-center justify-center rounded-full border text-[11px]">
              {i < current ? "\u2713" : i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {done ? (
        <p className="font-mono text-sm text-success">Re-key complete for {node.name}.</p>
      ) : (
        <Button onClick={() => setCurrent((c) => c + 1)} type="button">
          {steps[current]}
        </Button>
      )}
    </div>
  );
};
