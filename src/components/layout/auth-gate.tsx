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

import { Wordmark } from "@/components/layout/wordmark";
import { useAuth } from "@/context/auth";

// While the browser presents its client certificate for mTLS, show a gate
// instead of the app. Once the (stubbed) handshake resolves to an authenticated
// operator, the routed shell renders.
export const AuthGate = ({ children }: { children: ReactNode }) => {
  const { status } = useAuth();

  if (status === "authenticated") {
    return <>{children}</>;
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
        <Wordmark className="text-2xl" />
        <div className="flex flex-col items-center gap-2 font-mono text-sm text-muted-foreground">
          <span className="text-primary">No valid operator certificate</span>
          <span>Install an operator certificate issued by this fleet&apos;s PKI to continue.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <Wordmark className="text-2xl" />
      <div className="flex items-center gap-3 font-mono text-sm text-muted-foreground">
        <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-primary" />
        Presenting client certificate&hellip;
      </div>
    </div>
  );
};
