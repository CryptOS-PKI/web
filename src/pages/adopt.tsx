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

import { create } from "@bufbuild/protobuf";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";
import { MachineConfigSchema } from "@/gen/fleet/cryptos/v1/config_pb";
import { adoptNode, type AdoptionPreview, type AdoptPhase, previewAdoption } from "@/lib/adopt";

const field = "w-full rounded-md border bg-card px-3 py-2 font-mono text-sm";
const label = "font-mono text-[11px] uppercase tracking-wider text-muted-foreground";

// The same key-protection tiers the S5 config form offers, mapped to the
// node's StateKey.mode token so the initial config uses real values.
const tiers = ["nodeID (dev)", "TPM-sealed", "HSM"];
const tierToMode: Record<string, string> = {
  HSM: "kms",
  "nodeID (dev)": "nodeid",
  "TPM-sealed": "tpm",
};

// The manager's documented phases, in order, so the progress rail can show
// every step and mark those already passed.
const PHASES = ["applying-config", "installing", "awaiting-reboot", "ceremony", "established"];

// PhaseRail renders the ordered adoption phases with the current one
// highlighted and completed ones checked. It reads live from the streamed
// phases so partial progress stays visible if a later step needs follow-up.
const PhaseRail = ({ current, error }: { current: null | string; error: boolean }) => {
  const currentIndex = current ? PHASES.indexOf(current) : -1;
  return (
    <ol className="space-y-1.5">
      {PHASES.map((p, i) => {
        const passed = currentIndex > i || (currentIndex === i && current === "established");
        const active = currentIndex === i && current !== "established";
        return (
          <li className="flex items-center gap-2 font-mono text-xs" key={p}>
            <span
              className={
                error && active
                  ? "text-destructive"
                  : passed
                    ? "text-success"
                    : active
                      ? "text-primary"
                      : "text-muted-foreground"
              }
            >
              {passed ? "✓" : active ? "→" : "·"} {p}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export const AdoptPage = () => {
  const { operator } = useAuth();
  const isAdmin = operator?.level === "admin";

  const [endpoint, setEndpoint] = useState("");
  const [preview, setPreview] = useState<AdoptionPreview | null>(null);
  const [confirmedPin, setConfirmedPin] = useState<null | string>(null);

  const [nodeName, setNodeName] = useState("");
  const [disk, setDisk] = useState("/dev/sda");
  const [crl, setCrl] = useState("");
  const [tier, setTier] = useState(tiers[0]);

  const [phase, setPhase] = useState<AdoptPhase | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!isAdmin) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Adopt node</h1>
        <p className="font-mono text-sm text-muted-foreground">
          Adopting a node requires admin level.
        </p>
      </section>
    );
  }

  const runPreview = async () => {
    setError("");
    setPending(true);
    setPreview(null);
    setConfirmedPin(null);
    try {
      setPreview(await previewAdoption(endpoint));
    } catch (error_: unknown) {
      setError(error_ instanceof Error ? error_.message : "Preview failed");
    } finally {
      setPending(false);
    }
  };

  const runAdopt = async () => {
    if (!confirmedPin) return;
    setError("");
    setPending(true);
    setPhase(null);
    // The initial config the manager applies to the maintenance node. Only the
    // fields the operator set are populated; the node fills its build-time
    // defaults for the rest.
    const config = create(MachineConfigSchema, {
      apiVersion: "cryptos.dev/v1alpha1",
      install: { disk },
      kind: "MachineConfig",
      metadata: { name: nodeName },
      pki: { revocationBaseUrl: crl },
      stateKey: { mode: tierToMode[tier] ?? "" },
    });
    try {
      for await (const step of adoptNode(endpoint, confirmedPin, config)) {
        setPhase(step);
      }
    } catch (error_: unknown) {
      setError(error_ instanceof Error ? error_.message : "Adoption failed");
    } finally {
      setPending(false);
    }
  };

  const established = phase?.done && phase.phase === "established";

  return (
    <section className="max-w-xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Adopt node</h1>
        <p className="text-sm text-muted-foreground">
          Provision a new node from maintenance mode: confirm its identity, set its initial config,
          and let the manager orchestrate the enrollment ceremony.
        </p>
      </div>

      {/* Step 1: endpoint + trust-on-first-use fingerprint confirmation. */}
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Step 1 — maintenance endpoint
        </p>
        <label className="block space-y-1">
          <span className={label}>Endpoint (host:port)</span>
          <input
            className={field}
            disabled={!!confirmedPin}
            onChange={(e) => setEndpoint(e.target.value)}
            value={endpoint}
          />
        </label>
        {confirmedPin ? null : (
          <Button disabled={pending || !endpoint.trim()} onClick={() => void runPreview()} size="sm">
            {pending ? "Contacting…" : "Preview"}
          </Button>
        )}

        {preview && !confirmedPin ? (
          <div className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3">
            <p className="text-xs text-muted-foreground">
              First contact. Confirm this is the node you expect before trusting it.
            </p>
            <p className="break-all font-mono text-xs">
              <span className="text-muted-foreground">subject </span>
              {preview.subject}
            </p>
            <p className="break-all font-mono text-xs">
              <span className="text-muted-foreground">sha256 </span>
              {preview.certSha256}
            </p>
            <Button onClick={() => setConfirmedPin(preview.certSha256)} size="sm">
              Confirm fingerprint
            </Button>
          </div>
        ) : null}

        {confirmedPin ? (
          <p className="font-mono text-xs text-success" role="status">
            Fingerprint pinned for this adoption.
          </p>
        ) : null}
      </div>

      {/* Step 2: initial config + orchestrated adoption. */}
      {confirmedPin ? (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Step 2 — initial config
          </p>
          <label className="block space-y-1">
            <span className={label}>Node name</span>
            <input className={field} onChange={(e) => setNodeName(e.target.value)} value={nodeName} />
          </label>
          <label className="block space-y-1">
            <span className={label}>Install disk</span>
            <input className={field} onChange={(e) => setDisk(e.target.value)} value={disk} />
          </label>
          <label className="block space-y-1">
            <span className={label}>Revocation base URL (CRL/OCSP)</span>
            <input className={field} onChange={(e) => setCrl(e.target.value)} value={crl} />
          </label>
          <label className="block space-y-1">
            <span className={label}>Key protection tier</span>
            <select className={field} onChange={(e) => setTier(e.target.value)} value={tier}>
              {tiers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          {phase ? (
            <div className="space-y-2 rounded-md border bg-secondary p-3">
              <PhaseRail current={phase.phase} error={!!error} />
              {phase.detail ? (
                <p className="font-mono text-xs text-muted-foreground" role="status">
                  {phase.detail}
                </p>
              ) : null}
            </div>
          ) : null}

          {established ? (
            <p className="font-mono text-sm text-success" role="status">
              {nodeName || "The node"} is established and linked to the fleet.
            </p>
          ) : (
            <Button disabled={pending || !nodeName.trim()} onClick={() => void runAdopt()} size="sm">
              {pending ? "Adopting…" : "Adopt node"}
            </Button>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="font-mono text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
};
