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

import { useEffect, useSyncExternalStore } from "react";

import { recordAudit } from "@/lib/audit";
import { fleetClient } from "@/lib/fleet/client";
import { fleetMode } from "@/lib/fleet/mode";

import type { CertProfile as ProtoCertProfile } from "@/gen/fleet/cryptos/fleet/v1/fleet_pb";

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

// The live profile catalog, populated by ListProfiles over Connect. A
// separate store from the mock catalog above: `live`/`live-auth` read this
// array and never touch the mock one, so flipping VITE_FLEET_MODE never
// mixes the two. Mirrors the live-store pattern in lib/nodes.ts.
let liveProfiles: CertProfile[] = [];
const liveListeners = new Set<() => void>();
const emitLive = (): void => {
  for (const l of liveListeners) l();
};
const subscribeLive = (l: () => void): (() => void) => {
  liveListeners.add(l);
  return () => liveListeners.delete(l);
};

// CertProfile (proto) -> the web CertProfile shape, field for field. is_ca ->
// isCA; path_len is only meaningful for CA profiles, so a zero on a non-CA
// profile is treated as "not set" rather than a real path length of 0.
const fromProtoProfile = (profile: ProtoCertProfile): CertProfile => ({
  extKeyUsage: profile.extKeyUsage,
  isCA: profile.isCa,
  keyAlg: profile.keyAlg,
  keyUsage: profile.keyUsage,
  name: profile.name,
  pathLen: profile.isCa && profile.pathLen !== 0 ? profile.pathLen : undefined,
  sans: profile.sans,
  validityDays: profile.validityDays,
});

const PROFILES_POLL_INTERVAL_MS = 10_000;

// Fetches ListProfiles once and (for `live`/`live-auth`) keeps polling on an
// interval so a newly created/updated profile is picked up without a reload.
// Errors are swallowed to a console warning: a manager outage should degrade
// the profiles view to whatever it last had, not throw the page into an
// error boundary.
const refreshLiveProfiles = async (): Promise<void> => {
  try {
    const response = await fleetClient().listProfiles({});
    liveProfiles = response.items.map(fromProtoProfile);
    emitLive();
  } catch (error) {
    // eslint-disable-next-line no-console -- surfaced for local live debugging
    console.warn("fleet: ListProfiles failed", error);
  }
};

export const useProfiles = (): CertProfile[] => {
  const mode = fleetMode();

  useEffect(() => {
    if (mode === "mock") return;
    void refreshLiveProfiles();
    const interval = setInterval(() => void refreshLiveProfiles(), PROFILES_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [mode]);

  return useSyncExternalStore(
    mode === "mock" ? subscribe : subscribeLive,
    () => (mode === "mock" ? profiles : liveProfiles),
    () => (mode === "mock" ? profiles : liveProfiles),
  );
};

// live writes: roadmap -- createProfile/updateProfile stay mock-only for this
// read-only run; they mutate the mock store regardless of fleetMode(), and a
// live manager write path isn't wired yet.
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
  const exists = profiles.some((p) => p.name === name);
  profiles = profiles.map((p) => (p.name === name ? { ...p, ...patch } : p));
  emit();
  if (!exists) return;
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
