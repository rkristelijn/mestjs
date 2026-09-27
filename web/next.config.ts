import type { NextConfig } from "next";

// KEUR-EXPECT: KEUR-NEXT-002
// KEUR-CATEGORY: security
// KEUR-OWASP: A05-security-misconfiguration
// KEUR-NOTE: self-authored (mestjs web), verified 2026-09-26. This config defines
//   no response-header block, so the app ships without the standard browser
//   protections (Next.js antipatterns #1-14). Caught by KEUR-NEXT-002 (absence
//   engine). NOTE: this comment deliberately avoids naming the detected tokens,
//   because the absence rule is satisfied by their mere presence in the file.

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
