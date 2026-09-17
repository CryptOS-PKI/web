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

import { Code, ConnectError } from "@connectrpc/connect";
import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

import { fleetClient } from "@/lib/fleet/client";
import { fleetMode } from "@/lib/fleet/mode";

// Auth-gate for browser-side mTLS. In production the operator authenticates
// with a smart-card / YubiKey-backed client certificate presented by the browser
// during the TLS handshake; there is no password login. The manager verifies the
// handshake and reports the operator's identity back through WhoAmI.
//
// Signing in is deliberately an explicit action (#68). Arriving at the page
// starts anonymous and asks the API nothing, even when the browser is holding a
// perfectly good certificate: the operator presses Log in, and that is what
// resolves their identity and access level. The page itself is reachable without
// a certificate, which is the only way someone who has none can be told so.
//
// Note the browser decides *when* to present a certificate -- that happens
// during the TLS handshake, before any of this runs -- so Log in checks the
// result of that handshake rather than triggering it. A dev browser cannot
// perform smart-card mTLS at all, so mock mode resolves a fixed operator
// identity, still behind the same explicit action.

export interface AuthState {
  /** Resolve the operator's identity and level from the presented certificate. */
  login: () => void;
  operator: null | Operator;
  reason: DenialReason | null;
  status: AuthStatus;
}

export type AuthStatus = "anonymous" | "authenticated" | "denied" | "presenting";

/**
 * Why a login attempt was refused. Each one sends the operator somewhere
 * different, so they are kept apart rather than collapsed into one failure.
 */
export type DenialReason =
  /** The handshake carried no client certificate: none is installed. */
  | "no-certificate"
  /** A certificate was presented but the fleet will not accept it. */
  | "not-authorized"
  /** The manager could not be reached, which is not an authorization answer. */
  | "unavailable";

export interface Operator {
  /** Common name from the operator's client certificate subject. */
  commonName: string;
  /** Authorization level the manager assigned to this operator. */
  level: OperatorLevel;
  /** Certificate serial the manager verified during the mTLS handshake. */
  serial: string;
}

export type OperatorLevel = "admin" | "operator" | "viewer";

const AuthContext = createContext<AuthState | undefined>(undefined);

const DEV_OPERATOR: Operator = {
  commonName: "operator@acme.example",
  level: "admin",
  serial: "3A:7F:0C:91:D2:44:8B:1E",
};

const toLevel = (s: string): OperatorLevel => (s === "admin" || s === "operator" ? s : "viewer");

// The manager answers 401 when the handshake presented no certificate and 403
// when it presented one that is not an authorized operator, which Connect
// surfaces as these codes.
const toReason = (err: unknown): DenialReason => {
  switch (ConnectError.from(err).code) {
    case Code.PermissionDenied: {
      return "not-authorized";
    }
    case Code.Unauthenticated: {
      return "no-certificate";
    }
    default: {
      return "unavailable";
    }
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [operator, setOperator] = useState<null | Operator>(null);
  const [reason, setReason] = useState<DenialReason | null>(null);
  const [status, setStatus] = useState<AuthStatus>("anonymous");

  const login = useCallback(() => {
    setStatus("presenting");
    setReason(null);

    if (fleetMode() === "mock") {
      setOperator(DEV_OPERATOR);
      setStatus("authenticated");

      return;
    }

    void fleetClient()
      .whoAmI({})
      .then((resp) => {
        const op = resp.operator;
        if (!op) {
          // The manager withholds an identity for a certificate it verified but
          // will not accept as an operator.
          setOperator(null);
          setReason("not-authorized");
          setStatus("denied");

          return;
        }
        setOperator({ commonName: op.cn, level: toLevel(op.level), serial: op.serial });
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        setOperator(null);
        setReason(toReason(error));
        setStatus("denied");
      });
  }, []);

  return (
    <AuthContext.Provider value={{ login, operator, reason, status }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// useOptionalAuth reads the auth state without requiring a provider, returning
// null when there is none. Display components that embed in many contexts (the
// fleet list, the topology explorer, a standalone node view) use this to gate
// an admin-only action without forcing every render site to mount a provider.
export const useOptionalAuth = (): AuthState | null => useContext(AuthContext) ?? null;
