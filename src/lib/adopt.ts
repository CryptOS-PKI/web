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

import type { MachineConfig } from "@/gen/fleet/cryptos/v1/config_pb";
import { fleetClient } from "@/lib/fleet/client";
import { fleetMode } from "@/lib/fleet/mode";

// Adopt-a-new-node (S10). The web drives two manager RPCs: PreviewAdoption
// (unary, trust-on-first-use fingerprint) and AdoptNode (server-streaming,
// live phase progress). The web never contacts the maintenance node directly
// and never sends any secret to an unpinned endpoint -- the manager holds the
// pin and orchestrates the whole apply -> install -> reboot -> ceremony flow.

// AdoptionPreview is the maintenance node's presented identity the operator
// confirms before adoption proceeds.
export interface AdoptionPreview {
  certSha256: string;
  subject: string;
}

// AdoptPhase is one streamed step of the orchestration. `done` marks the final
// message; the phase string is one of the manager's documented phases
// (applying-config, installing, awaiting-reboot, ceremony, established) or an
// error phase when a step fails.
export interface AdoptPhase {
  detail: string;
  done: boolean;
  phase: string;
}

// previewAdoption fetches the maintenance node's certificate fingerprint and
// subject so the operator can confirm it (TOFU). `mock` returns a stable
// canned preview so the wizard is exercisable offline; live surfaces a
// manager/dial error to the caller with no silent fallback.
export const previewAdoption = async (endpoint: string): Promise<AdoptionPreview> => {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    throw new Error("A maintenance endpoint is required.");
  }

  if (fleetMode() === "mock") {
    return {
      certSha256: "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01",
      subject: `CN=maintenance,O=CryptOS (${trimmed})`,
    };
  }

  const response = await fleetClient().previewAdoption({ endpoint: trimmed });
  return { certSha256: response.certSha256, subject: response.subject };
};

// adoptNode drives the orchestrated adoption and yields each streamed phase.
// It is an async generator so the wizard can render progress as it arrives.
// In `mock` mode it walks a scripted sequence of phases (no live stream) so the
// progress UI is demonstrable offline; live relays the manager's stream, and a
// manager/node error propagates out of the iteration for the wizard to show
// inline rather than being swallowed. No secret is sent to an unpinned
// endpoint: the operator-confirmed fingerprint is passed as the pin.
export async function* adoptNode(
  endpoint: string,
  pinnedCertSha256: string,
  config: MachineConfig,
): AsyncGenerator<AdoptPhase> {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    throw new Error("A maintenance endpoint is required.");
  }
  if (!pinnedCertSha256) {
    throw new Error("Confirm the certificate fingerprint before adopting.");
  }

  if (fleetMode() === "mock") {
    const scripted: AdoptPhase[] = [
      { detail: "Applying the initial machine config.", done: false, phase: "applying-config" },
      { detail: "Installing the CryptOS runtime.", done: false, phase: "installing" },
      { detail: "Waiting for the node to reboot.", done: false, phase: "awaiting-reboot" },
      { detail: "Running the enrollment ceremony.", done: false, phase: "ceremony" },
      { detail: "Node established and linked to the fleet.", done: true, phase: "established" },
    ];
    for (const step of scripted) {
      // A short delay makes the mock progress visibly step through phases.
      await new Promise((resolve) => setTimeout(resolve, 150));
      yield step;
    }
    return;
  }

  const stream = fleetClient().adoptNode({ config, endpoint: trimmed, pinnedCertSha256 });
  for await (const message of stream) {
    yield { detail: message.detail, done: message.done, phase: message.phase };
  }
}
