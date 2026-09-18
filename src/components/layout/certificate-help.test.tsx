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

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CertificateHelp } from "@/components/layout/certificate-help";

describe("CertificateHelp", () => {
  // An operator who has never installed a client certificate should not have to
  // guess which store their browser reads. Every platform we support gets its
  // own instructions.
  it.each([[/windows/i], [/macos/i], [/linux/i], [/firefox/i]])("covers %s", (platform) => {
    render(<CertificateHelp />);

    expect(screen.getByRole("heading", { name: platform })).toBeInTheDocument();
  });

  // Firefox keeps its own certificate store rather than using the OS one, which
  // is the single most common reason an import "did not work".
  it("says Firefox does not use the operating system store", () => {
    render(<CertificateHelp />);

    expect(screen.getByText(/own certificate store/i)).toBeInTheDocument();
  });

  it("gives the command for each platform that has one", () => {
    render(<CertificateHelp />);

    expect(screen.getByText(/certutil/)).toBeInTheDocument();
    expect(screen.getByText(/security import/)).toBeInTheDocument();
    expect(screen.getByText(/pk12util/)).toBeInTheDocument();
  });

  // The prompt happens during the TLS handshake, so this page cannot trigger it.
  // Without saying so, "I imported it and nothing happened" is the next question.
  it("tells the operator to reload after importing", () => {
    render(<CertificateHelp />);

    expect(screen.getByText(/reload/i)).toBeInTheDocument();
  });
});
