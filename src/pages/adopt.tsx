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
import {
  type AdoptionPreview,
  adoptNode,
  type AdoptPhase,
  fetchParentAnchor,
  previewAdoption,
} from "@/lib/adopt";
import { useNodes } from "@/lib/nodes";

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
// every step and mark those already passed. A root self-signs via the ceremony
// and reaches "established"; a subordinate skips the ceremony and ends at
// "awaiting-certificate", completed later by a subordinate enrollment.
const ROOT_PHASES = ["applying-config", "installing", "awaiting-reboot", "ceremony", "established"];
const SUBORDINATE_PHASES = [
  "applying-config",
  "installing",
  "awaiting-reboot",
  "awaiting-certificate",
];

// PhaseRail renders the ordered adoption phases with the current one
// highlighted and completed ones checked. It reads live from the streamed
// phases so partial progress stays visible if a later step needs follow-up.
// phaseTone picks the color class for one phase row from its state, avoiding a
// nested ternary in the JSX.
const phaseTone = (active: boolean, passed: boolean, error: boolean): string => {
  if (error && active) return "text-destructive";
  if (passed) return "text-success";
  if (active) return "text-primary";
  return "text-muted-foreground";
};

// phaseGlyph picks the leading marker for one phase row. Plain ASCII markers
// keep the source free of glyphs the hygiene scanner treats as emoji.
const phaseGlyph = (active: boolean, passed: boolean): string => {
  if (passed) return "[done]";
  if (active) return "[...]";
  return "[ ]";
};

const PhaseRail = ({
  current,
  error,
  phases,
}: {
  current: null | string;
  error: boolean;
  phases: string[];
}) => {
  const terminal = phases.at(-1);
  const currentIndex = current ? phases.indexOf(current) : -1;
  return (
    <ol className="space-y-1.5">
      {phases.map((p, i) => {
        const passed = currentIndex > i || (currentIndex === i && current === terminal);
        const active = currentIndex === i && current !== terminal;
        return (
          <li className="flex items-center gap-2 font-mono text-xs" key={p}>
            <span className={phaseTone(active, passed, error)}>
              {phaseGlyph(active, passed)} {p}
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
  const [role, setRole] = useState("root");
  const [netInterface, setNetInterface] = useState("eth0");
  const [address, setAddress] = useState("");
  const [gateway, setGateway] = useState("");
  const [rootCn, setRootCn] = useState("");
  const [validityYears, setValidityYears] = useState("10");
  const [disk, setDisk] = useState("/dev/sda");
  const [crl, setCrl] = useState("");
  const [tier, setTier] = useState(tiers[0]);

  // Subordinate (intermediate/issuing) adoption: the operator picks a parent
  // node and we embed its CA certificate as the trust anchor. Established nodes
  // are the eligible parents; the anchor is fetched on selection.
  const isSubordinate = role !== "root";
  const parents = useNodes().filter((n) => n.identityState === "ESTABLISHED");
  const [parentName, setParentName] = useState("");
  const [parentAnchor, setParentAnchor] = useState("");
  const [parentBusy, setParentBusy] = useState(false);

  const [phase, setPhase] = useState<AdoptPhase | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const selectParent = async (name: string) => {
    setParentName(name);
    setParentAnchor("");
    if (!name) return;
    setError("");
    setParentBusy(true);
    try {
      setParentAnchor(await fetchParentAnchor(name));
    } catch (error_: unknown) {
      setError(error_ instanceof Error ? error_.message : "Could not load the parent certificate");
    } finally {
      setParentBusy(false);
    }
  };

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
    // A root self-signs, so it carries root_validity_years and no parent. A
    // subordinate's validity comes from the parent's sub-CA profile at signing
    // time, so it omits root_validity_years and instead pins the parent anchor.
    // A subordinate is NOT a CA until its enrollment is signed, so it carries no
    // revocation config at adopt time (that is set later, once it is
    // established, via apply-config); sending it now stalls first-boot.
    const pki = isSubordinate
      ? {
          parent: { caCertPem: parentAnchor },
          rootKeyAlg: "ECDSA-P384",
          rootSubject: { commonName: rootCn },
        }
      : {
          revocationBaseUrl: crl,
          rootKeyAlg: "ECDSA-P384",
          rootSubject: { commonName: rootCn },
          rootValidityYears: Number(validityYears) || 10,
        };
    const config = create(MachineConfigSchema, {
      apiVersion: "cryptos.dev/v1alpha1",
      install: { disk },
      kind: "MachineConfig",
      metadata: { name: nodeName },
      network: { address, gateway, interface: netInterface },
      pki,
      role: { kind: role },
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
  const awaitingCert = phase?.done && phase.phase === "awaiting-certificate";

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
          <Button
            disabled={pending || !endpoint.trim()}
            onClick={() => void runPreview()}
            size="sm"
          >
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
            <input
              className={field}
              onChange={(e) => setNodeName(e.target.value)}
              value={nodeName}
            />
          </label>
          <label className="block space-y-1">
            <span className={label}>Role</span>
            <select className={field} onChange={(e) => setRole(e.target.value)} value={role}>
              {["root", "intermediate", "issuing"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          {/* A subordinate is signed by a parent CA already in the fleet: pick it
              and pin its certificate as the trust anchor. */}
          {isSubordinate ? (
            <label className="block space-y-1">
              <span className={label}>Parent CA (signs this node)</span>
              <select
                className={field}
                onChange={(e) => void selectParent(e.target.value)}
                value={parentName}
              >
                <option value="">Select a parent…</option>
                {parents.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.cn ? `${n.name} — ${n.cn}` : n.name}
                  </option>
                ))}
              </select>
              {parentBusy ? (
                <span className="font-mono text-[11px] text-muted-foreground" role="status">
                  Loading parent certificate…
                </span>
              ) : null}
              {parentAnchor && !parentBusy ? (
                <span className="font-mono text-[11px] text-success" role="status">
                  Parent certificate pinned as the trust anchor.
                </span>
              ) : null}
              {parents.length === 0 ? (
                <span className="font-mono text-[11px] text-warning">
                  No established parent CA in the fleet yet — adopt a root first.
                </span>
              ) : null}
            </label>
          ) : null}

          <label className="block space-y-1">
            <span className={label}>
              {isSubordinate ? "CA subject common name" : "Root CA subject common name"}
            </span>
            <input className={field} onChange={(e) => setRootCn(e.target.value)} value={rootCn} />
          </label>
          {isSubordinate ? null : (
            <label className="block space-y-1">
              <span className={label}>Root validity (years)</span>
              <input
                className={field}
                onChange={(e) => setValidityYears(e.target.value)}
                value={validityYears}
              />
            </label>
          )}
          <label className="block space-y-1">
            <span className={label}>Network interface</span>
            <input
              className={field}
              onChange={(e) => setNetInterface(e.target.value)}
              value={netInterface}
            />
          </label>
          <label className="block space-y-1">
            <span className={label}>Address (CIDR)</span>
            <input
              className={field}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="10.0.0.10/24"
              value={address}
            />
          </label>
          <label className="block space-y-1">
            <span className={label}>Gateway</span>
            <input
              className={field}
              onChange={(e) => setGateway(e.target.value)}
              placeholder="10.0.0.1"
              value={gateway}
            />
          </label>
          <label className="block space-y-1">
            <span className={label}>Install disk</span>
            <input className={field} onChange={(e) => setDisk(e.target.value)} value={disk} />
          </label>
          {/* Revocation is a CA responsibility, so it is offered only for a root
              at adopt time. A subordinate is not a CA until its enrollment is
              signed; its revocation base URL is set afterward via apply-config. */}
          {isSubordinate ? null : (
            <label className="block space-y-1">
              <span className={label}>Revocation base URL (CRL/OCSP)</span>
              <input className={field} onChange={(e) => setCrl(e.target.value)} value={crl} />
            </label>
          )}
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
              <PhaseRail
                current={phase.phase}
                error={!!error}
                phases={isSubordinate ? SUBORDINATE_PHASES : ROOT_PHASES}
              />
              {phase.detail ? (
                <p className="font-mono text-xs text-muted-foreground" role="status">
                  {phase.detail}
                </p>
              ) : null}
            </div>
          ) : null}

          {(() => {
            if (established) {
              return (
                <p className="font-mono text-sm text-success" role="status">
                  {nodeName || "The node"} is established and linked to the fleet.
                </p>
              );
            }
            if (awaitingCert) {
              return (
                <p className="font-mono text-sm text-success" role="status">
                  {nodeName || "The node"} is provisioned and awaiting a parent-signed certificate.
                  Complete it from Enrollment (create a subordinate enrollment with parent{" "}
                  {parentName || "the selected CA"}).
                </p>
              );
            }
            return (
              <Button
                disabled={pending || !nodeName.trim() || (isSubordinate && !parentAnchor)}
                onClick={() => void runAdopt()}
                size="sm"
              >
                {pending ? "Adopting…" : "Adopt node"}
              </Button>
            );
          })()}
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
