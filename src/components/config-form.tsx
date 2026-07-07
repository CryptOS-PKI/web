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

const tiers = ["nodeID (dev)", "TPM-sealed", "HSM"];
const field = "w-full rounded-md border bg-card px-3 py-2 font-mono text-sm";

export const ConfigForm = ({ node }: { node: Node }) => {
  const [crl, setCrl] = useState(node.crl ?? "");
  const [ocsp, setOcsp] = useState(node.ocsp ?? "");
  const [tier, setTier] = useState(tiers[0]);
  const [applied, setApplied] = useState(false);

  return (
    <div className="max-w-md space-y-4">
      <label className="block space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          CRL distribution point
        </span>
        <input className={field} onChange={(e) => setCrl(e.target.value)} value={crl} />
      </label>
      <label className="block space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          OCSP responder
        </span>
        <input className={field} onChange={(e) => setOcsp(e.target.value)} value={ocsp} />
      </label>
      <label className="block space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Key protection tier
        </span>
        <select className={field} onChange={(e) => setTier(e.target.value)} value={tier}>
          {tiers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      {applied ? (
        <p className="font-mono text-sm text-success">Config applied to {node.name}.</p>
      ) : null}
      <Button onClick={() => setApplied(true)} type="button">
        Apply
      </Button>
    </div>
  );
};
