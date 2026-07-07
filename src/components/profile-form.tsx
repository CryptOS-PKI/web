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
import {
  type CertProfile,
  createProfile,
  EXT_KEY_USAGE_OPTIONS,
  KEY_ALG_OPTIONS,
  KEY_USAGE_OPTIONS,
  updateProfile,
} from "@/lib/profiles";
import { cn } from "@/lib/utils";

const field = "w-full rounded-md border bg-card px-3 py-2 font-mono text-sm";
const empty: CertProfile = {
  extKeyUsage: [],
  isCA: false,
  keyAlg: "ECDSA-P384",
  keyUsage: ["digital_signature"],
  name: "",
  sans: [],
  validityDays: 365,
};

const toggle = (list: string[], value: string): string[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const CheckGroup = ({
  label,
  onToggle,
  options,
  selected,
}: {
  label: string;
  onToggle: (v: string) => void;
  options: string[];
  selected: string[];
}) => (
  <div className="space-y-1">
    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          className={cn(
            "rounded-md border px-2.5 py-1 font-mono text-xs",
            selected.includes(o)
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary",
          )}
          key={o}
          onClick={() => onToggle(o)}
          type="button"
        >
          {o}
        </button>
      ))}
    </div>
  </div>
);

export const ProfileForm = ({
  initial,
  mode,
  onDone,
}: {
  initial?: CertProfile;
  mode: "create" | "edit";
  onDone: (name: string) => void;
}) => {
  const [p, setP] = useState<CertProfile>(initial ?? empty);
  const [error, setError] = useState("");

  const submit = () => {
    if (mode === "create") {
      const res = createProfile(p);
      if (!res.ok) {
        setError(res.reason ?? "Could not create profile.");
        return;
      }
    } else {
      updateProfile(p.name, p);
    }
    onDone(p.name);
  };

  return (
    <div className="max-w-lg space-y-4">
      <label className="block space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Name
        </span>
        <input
          className={field}
          disabled={mode === "edit"}
          onChange={(e) => setP({ ...p, name: e.target.value })}
          value={p.name}
        />
      </label>

      <label className="block space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Key algorithm
        </span>
        <select
          className={field}
          onChange={(e) => setP({ ...p, keyAlg: e.target.value })}
          value={p.keyAlg}
        >
          {KEY_ALG_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Validity (days)
        </span>
        <input
          aria-label="Validity (days)"
          className={field}
          onChange={(e) => setP({ ...p, validityDays: Number(e.target.value) })}
          type="number"
          value={p.validityDays}
        />
      </label>

      <label className="flex items-center gap-2 font-mono text-sm">
        <input
          checked={p.isCA}
          onChange={(e) => setP({ ...p, isCA: e.target.checked })}
          type="checkbox"
        />
        CA certificate (basic constraints)
      </label>

      {p.isCA ? (
        <label className="block space-y-1">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Path length
          </span>
          <input
            className={field}
            onChange={(e) => setP({ ...p, pathLen: Number(e.target.value) })}
            type="number"
            value={p.pathLen ?? 0}
          />
        </label>
      ) : null}

      <CheckGroup
        label="Key usage"
        onToggle={(v) => setP({ ...p, keyUsage: toggle(p.keyUsage, v) })}
        options={KEY_USAGE_OPTIONS}
        selected={p.keyUsage}
      />
      <CheckGroup
        label="Extended key usage"
        onToggle={(v) => setP({ ...p, extKeyUsage: toggle(p.extKeyUsage, v) })}
        options={EXT_KEY_USAGE_OPTIONS}
        selected={p.extKeyUsage}
      />

      {error ? <p className="font-mono text-xs text-destructive">{error}</p> : null}
      <Button onClick={submit} type="button">
        Save
      </Button>
    </div>
  );
};
