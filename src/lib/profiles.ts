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

import { useSyncExternalStore } from "react";

import { recordAudit } from "@/lib/audit";

// Mirrors the cryptos.v1 CertificateProfile proto (config.proto): the reusable
// issuance template that the issue flow and future enrollment adapters draw from.
export interface CertProfile {
  extKeyUsage: string[];
  isCA: boolean;
  keyAlg: string;
  keyUsage: string[];
  name: string;
  pathLen?: number;
  sans: string[];
  validityDays: number;
}

export const KEY_ALG_OPTIONS = ["ECDSA-P256", "ECDSA-P384", "RSA-3072", "RSA-4096"];
export const KEY_USAGE_OPTIONS = ["digital_signature", "key_encipherment", "cert_sign", "crl_sign"];
export const EXT_KEY_USAGE_OPTIONS = ["server_auth", "client_auth", "code_signing"];

const seed = (): CertProfile[] => [
  {
    extKeyUsage: ["server_auth"],
    isCA: false,
    keyAlg: "ECDSA-P384",
    keyUsage: ["digital_signature", "key_encipherment"],
    name: "TLS Server (LDAPS)",
    sans: [],
    validityDays: 365,
  },
  {
    extKeyUsage: ["client_auth"],
    isCA: false,
    keyAlg: "ECDSA-P384",
    keyUsage: ["digital_signature"],
    name: "TLS Client",
    sans: [],
    validityDays: 365,
  },
  {
    extKeyUsage: ["server_auth", "client_auth"],
    isCA: false,
    keyAlg: "ECDSA-P384",
    keyUsage: ["digital_signature", "key_encipherment"],
    name: "Domain Controller",
    sans: [],
    validityDays: 365,
  },
  {
    extKeyUsage: ["code_signing"],
    isCA: false,
    keyAlg: "RSA-3072",
    keyUsage: ["digital_signature"],
    name: "Code Signing",
    sans: [],
    validityDays: 1095,
  },
  {
    extKeyUsage: [],
    isCA: true,
    keyAlg: "ECDSA-P384",
    keyUsage: ["cert_sign", "crl_sign"],
    name: "Subordinate CA",
    pathLen: 0,
    sans: [],
    validityDays: 1825,
  },
];

let profiles: CertProfile[] = seed();
const listeners = new Set<() => void>();
const emit = (): void => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const profilesList = (): CertProfile[] => profiles;
export const getProfile = (name: string): CertProfile | undefined =>
  profiles.find((p) => p.name === name);

export const useProfiles = (): CertProfile[] =>
  useSyncExternalStore(
    subscribe,
    () => profiles,
    () => profiles,
  );

export const createProfile = (p: CertProfile): { ok: boolean; reason?: string } => {
  if (!p.name.trim()) return { ok: false, reason: "Name is required." };
  if (getProfile(p.name))
    return { ok: false, reason: `A profile named "${p.name}" already exists.` };
  profiles = [...profiles, p];
  emit();
  recordAudit({
    kind: "profile-created",
    summary: `Created profile ${p.name}`,
    targetKind: "profile",
    targetPath: `/profiles/${p.name}`,
  });
  return { ok: true };
};

export const updateProfile = (name: string, patch: Partial<CertProfile>): void => {
  profiles = profiles.map((p) => (p.name === name ? { ...p, ...patch } : p));
  emit();
  recordAudit({
    kind: "profile-updated",
    summary: `Updated profile ${name}`,
    targetKind: "profile",
    targetPath: `/profiles/${name}`,
  });
};

// Test-only.
export const __resetProfiles = (): void => {
  profiles = seed();
  emit();
};
