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

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { fleetClient } from "@/lib/fleet/client";
import { fleetMode } from "@/lib/fleet/mode";

// Auth-gate for browser-side mTLS. In production the operator authenticates
// with a smart-card / YubiKey-backed client certificate presented by the browser
// during the TLS handshake; there is no password login. The manager verifies
// the handshake and reports the operator's identity back through WhoAmI. A dev
// browser cannot perform smart-card mTLS, so the mock data source keeps a fixed
// operator identity to exercise the gate without a real certificate.

export type AuthStatus = "authenticated" | "denied" | "presenting";
export interface Operator {
  /** Common name from the operator's client certificate subject. */
  commonName: string;
  /** Authorization level the manager assigned to this operator. */
  level: OperatorLevel;
  /** Certificate serial the manager verified during the mTLS handshake. */
  serial: string;
}

export type OperatorLevel = "admin" | "operator" | "viewer";

interface AuthState {
  operator: null | Operator;
  status: AuthStatus;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const DEV_OPERATOR: Operator = {
  commonName: "operator@acme.example",
  level: "admin",
  serial: "3A:7F:0C:91:D2:44:8B:1E",
};

const toLevel = (s: string): OperatorLevel => (s === "admin" || s === "operator" ? s : "viewer");

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({ operator: null, status: "presenting" });

  useEffect(() => {
    if (fleetMode() === "mock") {
      // Simulate the handshake resolving to a verified operator identity.
      const timer = setTimeout(
        () => setState({ operator: DEV_OPERATOR, status: "authenticated" }),
        600,
      );
      return () => clearTimeout(timer);
    }
    let cancelled = false;
    void fleetClient()
      .whoAmI({})
      .then((resp) => {
        if (cancelled) return;
        const op = resp.operator;
        if (!op) {
          setState({ operator: null, status: "denied" });
          return;
        }
        setState({
          operator: { commonName: op.cn, level: toLevel(op.level), serial: op.serial },
          status: "authenticated",
        });
      })
      .catch(() => {
        if (!cancelled) setState({ operator: null, status: "denied" });
      });
    return () => {
      cancelled = true;
    };
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
