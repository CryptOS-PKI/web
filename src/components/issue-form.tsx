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
import { canIssue, type Cert, type CertKind, issueCert } from "@/lib/certs";
import {
  exportEncryptedKey,
  generateLeafKeyAndCSR,
  generateStrongPassphrase,
  MIN_PASSPHRASE_LENGTH,
  toPemEncryptedKey,
} from "@/lib/crypto/leaf-key";
import { fleetMode } from "@/lib/fleet/mode";
import { type Node } from "@/lib/mock";
import { getProfile, useProfiles } from "@/lib/profiles";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-md border bg-card px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring";

// download triggers a browser download of contents under filename without
// leaving a URL object behind.
const download = (filename: string, contents: BlobPart, type: string): void => {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.download = filename;
  anchor.href = url;
  anchor.click();
  URL.revokeObjectURL(url);
};

// KeyExport is the guarded, always-encrypted private-key export shown after a
// live issuance. The exported key is never plaintext: it requires a passphrase
// of at least MIN_PASSPHRASE_LENGTH characters (enforced again in
// exportEncryptedKey) and a two-step in-UI confirmation -- a "saved the
// passphrase" checkbox plus an explicit export click. No native popups.
const KeyExport = ({ privateKey, subjectCn }: { privateKey: CryptoKey; subjectCn: string }) => {
  const [passphrase, setPassphrase] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const longEnough = passphrase.length >= MIN_PASSPHRASE_LENGTH;

  const exportKey = () => {
    setPending(true);
    setError("");
    exportEncryptedKey(privateKey, passphrase)
      .then((der) => {
        download(`${subjectCn}.key.pem`, toPemEncryptedKey(der), "application/x-pem-file");
        setDone(true);
      })
      .catch((error_: unknown) => {
        setError(error_ instanceof Error ? error_.message : "Export failed");
      })
      .finally(() => setPending(false));
  };

  return (
    <div className="space-y-3 rounded-md border bg-card p-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Export private key (always encrypted)
      </p>
      <label className="block space-y-1">
        <span className="font-mono text-[11px] text-muted-foreground">
          Passphrase (min {MIN_PASSPHRASE_LENGTH} characters)
        </span>
        <input
          className={field}
          onChange={(e) => {
            setPassphrase(e.target.value);
            setSaved(false);
            setDone(false);
          }}
          type="password"
          value={passphrase}
        />
      </label>
      <Button
        onClick={() => {
          setPassphrase(generateStrongPassphrase());
          setSaved(false);
          setDone(false);
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        Generate strong passphrase
      </Button>
      {passphrase && !longEnough ? (
        <p className="font-mono text-xs text-destructive">
          Passphrase must be at least {MIN_PASSPHRASE_LENGTH} characters.
        </p>
      ) : null}
      <label className="flex items-center gap-2 font-mono text-xs">
        <input
          checked={saved}
          disabled={!longEnough}
          onChange={(e) => setSaved(e.target.checked)}
          type="checkbox"
        />
        <span>I have saved the passphrase somewhere safe</span>
      </label>
      {error ? (
        <p className="font-mono text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {done ? <p className="font-mono text-xs text-success">Encrypted key downloaded.</p> : null}
      <Button
        disabled={!longEnough || !saved || pending}
        onClick={exportKey}
        size="sm"
        type="button"
      >
        {pending ? "Exporting…" : "Export private key"}
      </Button>
    </div>
  );
};

export const IssueForm = ({ node, onIssued }: { node: Node; onIssued: (cert: Cert) => void }) => {
  const kinds = canIssue(node);
  const profiles = useProfiles();
  const [kind, setKind] = useState<CertKind>(kinds[0]);
  const [profileName, setProfileName] = useState("");
  const [subjectCn, setSubjectCn] = useState("");
  const [sans, setSans] = useState("");
  const [pathLen, setPathLen] = useState("0");
  const [validityDays, setValidityDays] = useState("90");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [issued, setIssued] = useState<Cert | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);

  const submit = async () => {
    const cn = subjectCn.trim();
    if (!cn) {
      setError("Subject CN is required.");
      return;
    }
    const selected = profileName ? getProfile(profileName) : undefined;
    const defaultEku = kind === "leaf" ? ["serverAuth"] : [];
    const eku = selected ? selected.extKeyUsage : defaultEku;
    const sanList = sans
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setError("");
    setPending(true);
    try {
      // The browser owns the leaf keypair: only a live leaf issuance generates
      // a key + CSR and offers the guarded export. Sub-CA issuance and the mock
      // path keep the fixture-only behavior.
      let csrDer: Uint8Array | undefined;
      let key: CryptoKey | null = null;
      if (fleetMode() !== "mock" && kind === "leaf") {
        const generated = await generateLeafKeyAndCSR({ sans: sanList, subjectCn: cn });
        csrDer = generated.csrDer;
        key = generated.privateKey;
      }

      const cert = await issueCert(node.name, {
        csrDer,
        eku,
        kind,
        pathLen: kind === "subordinate-ca" ? Number(pathLen) : undefined,
        profile: profileName || undefined,
        sans: sanList,
        subjectCn: cn,
        validityDays: Number(validityDays),
      });

      setIssued(cert);
      setPrivateKey(key);
      onIssued(cert);
    } catch (error_: unknown) {
      setError(error_ instanceof Error ? error_.message : "Issuance failed");
    } finally {
      setPending(false);
    }
  };

  if (issued) {
    return (
      <div className="max-w-md space-y-3">
        <div className="space-y-1 rounded-md border bg-secondary p-3">
          <p className="font-mono text-sm">
            Issued <span className="text-success">{issued.subjectCn}</span>
          </p>
          <p className="font-mono text-xs text-muted-foreground">serial {issued.serial}</p>
        </div>
        {privateKey ? <KeyExport privateKey={privateKey} subjectCn={issued.subjectCn} /> : null}
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-4">
      {kinds.length > 1 ? (
        <div className="flex gap-1.5">
          {kinds.map((k) => (
            <button
              className={cn(
                "rounded-md border px-3 py-1.5 font-mono text-xs",
                kind === k
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary",
              )}
              key={k}
              onClick={() => setKind(k)}
              type="button"
            >
              {k === "subordinate-ca" ? "Subordinate CA" : "Leaf"}
            </button>
          ))}
        </div>
      ) : null}

      <label className="block space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Profile
        </span>
        <select
          className={field}
          onChange={(e) => {
            const v = e.target.value;
            setProfileName(v);
            const p = getProfile(v);
            if (p) {
              setValidityDays(String(p.validityDays));
              if (p.isCA && p.pathLen !== undefined) setPathLen(String(p.pathLen));
            }
          }}
          value={profileName}
        >
          <option value="">(none)</option>
          {profiles.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Subject CN
        </span>
        <input className={field} onChange={(e) => setSubjectCn(e.target.value)} value={subjectCn} />
      </label>

      {kind === "leaf" ? (
        <label className="block space-y-1">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            SANs (comma-separated)
          </span>
          <input className={field} onChange={(e) => setSans(e.target.value)} value={sans} />
        </label>
      ) : (
        <label className="block space-y-1">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Path length
          </span>
          <input
            className={field}
            onChange={(e) => setPathLen(e.target.value)}
            type="number"
            value={pathLen}
          />
        </label>
      )}

      <label className="block space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Validity (days)
        </span>
        <input
          className={field}
          onChange={(e) => setValidityDays(e.target.value)}
          type="number"
          value={validityDays}
        />
      </label>

      {error ? <p className="font-mono text-xs text-destructive">{error}</p> : null}
      <Button disabled={pending} onClick={() => void submit()} type="button">
        {pending ? "Issuing…" : "Issue"}
      </Button>
    </div>
  );
};
