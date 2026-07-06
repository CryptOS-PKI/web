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
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Auth-gate stub for browser-side mTLS. In production the operator authenticates
// with a smart-card / YubiKey-backed client certificate presented by the browser
// during the TLS handshake; there is no password login. A dev browser cannot
// perform smart-card mTLS, so this stub resolves to a fixed operator identity
// after a short delay to exercise the gate. Wiring the real client-cert handshake
// (and reading the verified subject the manager reports back) is a later concern.

export type AuthStatus = "presenting" | "authenticated";

export interface Operator {
  /** Common name from the operator's client certificate subject. */
  commonName: string;
  /** Certificate serial the manager verified during the mTLS handshake. */
  serial: string;
}

interface AuthState {
  status: AuthStatus;
  operator: Operator | null;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const DEV_OPERATOR: Operator = {
  commonName: "operator@acme.example",
  serial: "3A:7F:0C:91:D2:44:8B:1E",
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({ status: "presenting", operator: null });

  useEffect(() => {
    // Simulate the handshake resolving to a verified operator identity.
    const timer = setTimeout(() => {
      setState({ status: "authenticated", operator: DEV_OPERATOR });
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
