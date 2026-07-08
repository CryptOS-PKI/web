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

// UI-defined config for an enrollment protocol adapter (mock). The real
// protocol servers (ACME directory, XCEP/WSTEP, SCEP/EST) are roadmap E; this
// is the config surface that binds each protocol to a certificate profile.
export type AdapterKind = "acme" | "est" | "ms-autoenroll" | "scep";

export interface EnrollmentAdapter {
  challenges?: string[];
  enabled: boolean;
  endpoint: string;
  gpoTemplate?: string;
  kind: AdapterKind;
  name: string;
  profile: string;
}

const seed = (): EnrollmentAdapter[] => [
  {
    challenges: ["http-01", "dns-01"],
    enabled: true,
    endpoint: "https://pki.acme.example/acme/directory",
    kind: "acme",
    name: "ACME (RFC 8555)",
    profile: "TLS Server (LDAPS)",
  },
  {
    enabled: true,
    endpoint: "https://pki.acme.example/adpolicyprovider",
    gpoTemplate: "DomainController",
    kind: "ms-autoenroll",
    name: "Windows Autoenrollment (XCEP/WSTEP)",
    profile: "Domain Controller",
  },
  {
    enabled: false,
    endpoint: "https://pki.acme.example/scep",
    kind: "scep",
    name: "SCEP (RFC 8894)",
    profile: "TLS Client",
  },
  {
    enabled: false,
    endpoint: "https://pki.acme.example/.well-known/est",
    kind: "est",
    name: "EST (RFC 7030)",
    profile: "TLS Client",
  },
];

let adapters: EnrollmentAdapter[] = seed();
const listeners = new Set<() => void>();
const emit = (): void => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const adaptersList = (): EnrollmentAdapter[] => adapters;
export const getAdapter = (kind: AdapterKind): EnrollmentAdapter | undefined =>
  adapters.find((a) => a.kind === kind);

export const useAdapters = (): EnrollmentAdapter[] =>
  useSyncExternalStore(
    subscribe,
    () => adapters,
    () => adapters,
  );

const patch = (kind: AdapterKind, next: Partial<EnrollmentAdapter>): void => {
  adapters = adapters.map((a) => (a.kind === kind ? { ...a, ...next } : a));
  emit();
};

export const setEnabled = (kind: AdapterKind, on: boolean): void => patch(kind, { enabled: on });
export const updateAdapter = (kind: AdapterKind, next: Partial<EnrollmentAdapter>): void =>
  patch(kind, next);

// Test-only.
export const __resetAdapters = (): void => {
  adapters = seed();
  emit();
};
