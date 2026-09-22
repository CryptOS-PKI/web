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

import type { ReactNode } from "react";

import type { DenialReason } from "@/context/auth";

import { CertificateHelp } from "@/components/layout/certificate-help";
import { DiagnosticsCopy } from "@/components/layout/diagnostics-copy";
import { Wordmark } from "@/components/layout/wordmark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";

// The landing page, and the gate in front of the routed shell.
//
// This renders for an operator with no certificate at all, which is the whole
// point of it (#68): the manager serves the web surface anonymously, so someone
// who cannot get in is told why instead of meeting a TLS error with no
// explanation. Signing in is an explicit action -- holding a valid certificate
// does not walk you into the console.

// Each denial gets its own copy, because each one has a different fix. Sending
// an operator to install a certificate when the manager is simply unreachable
// wastes their time.
const denial: Record<DenialReason, { detail: string; title: string }> = {
  "no-certificate": {
    detail:
      "Your browser did not present one, so there is nothing to log in with. The service is running -- this is a certificate you need to install, not an outage.",
    title: "No operator certificate",
  },
  "not-authorized": {
    detail:
      "The certificate your browser presented is not authorized for this fleet. It may lack an access level, or it may have been revoked.",
    title: "Certificate not authorized",
  },
  unavailable: {
    detail:
      "The Fleet Manager API could not be reached. The service may be starting, or the node it proxies may be down.",
    title: "Fleet Manager unavailable",
  },
};

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
    <Wordmark className="text-2xl" />
    {children}
    {/* Reachable before sign-in on purpose: an operator who cannot get in is
        the one whose report is worth most, and they have no other surface
        (#83). */}
    <DiagnosticsCopy className="flex flex-col items-center" />
  </div>
);

export const AuthGate = ({ children }: { children: ReactNode }) => {
  const { login, reason, status } = useAuth();

  if (status === "authenticated") {
    return <>{children}</>;
  }

  if (status === "presenting") {
    return (
      <Shell>
        <div className="flex items-center gap-3 font-mono text-sm text-muted-foreground">
          <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-primary" />
          Checking your operator certificate&hellip;
        </div>
      </Shell>
    );
  }

  if (status === "denied") {
    const { detail, title } = denial[reason ?? "not-authorized"];

    return (
      <Shell>
        <div className="flex max-w-md flex-col items-center gap-2 text-center font-mono text-sm text-muted-foreground">
          <span className="text-primary">{title}</span>
          <span>{detail}</span>
        </div>
        {/* Only the missing-certificate case is something the operator can act
            on here, so it is the only one that carries instructions. */}
        {reason === "no-certificate" ? <CertificateHelp /> : null}
        <Button onClick={login} type="button" variant="outline">
          Try again
        </Button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex max-w-md flex-col items-center gap-2 text-center font-mono text-sm text-muted-foreground">
        <span>Fleet Manager for CryptOS-PKI.</span>
        <span>
          Logging in checks the operator certificate your browser presents and the access level it
          carries.
        </span>
      </div>
      <Button onClick={login} type="button">
        Log in
      </Button>
    </Shell>
  );
};
