import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Applied to every response, /api included — nosniff matters on JSON error
// bodies too. Deliberately NOT a full CSP: there is no script-src/style-src
// here, so none of the Tailwind v4 / Next inline-style nonce plumbing that
// md/step-a-security.md deferred is required to ship this.
const securityHeaders = [
  // Browsers ignore HSTS over plain http anyway, but gating it on production
  // keeps a dev machine from ever pinning localhost to https.
  //
  // `preload` is omitted on purpose — submitting to the preload list is a
  // one-way door that commits every subdomain to https and takes months to
  // unwind. Add it once a production domain is settled (and note *.vercel.app
  // is already preloaded upstream, so it buys nothing there).
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Modern browsers honour frame-ancestors over X-Frame-Options; both ship so
  // older ones stay covered.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// /api/files is the one response this app frames on purpose — the PDF preview
// dialog renders it in an iframe — so a blanket DENY makes the feature
// impossible rather than safer. Headers set here win over anything the route
// sets, so the exception has to live at this level.
//
// Same-origin only, and still sandboxed: `sandbox` with no allow-* puts the
// document in an opaque origin with scripting off, which is what keeps a
// PDF-with-JavaScript from being interesting now that it is served from our
// own origin instead of Cloudinary's.
const fileHeaders = securityHeaders.map(header => {
  if (header.key === "X-Frame-Options") return { ...header, value: "SAMEORIGIN" };
  if (header.key === "Content-Security-Policy") {
    return { ...header, value: "frame-ancestors 'self'; sandbox" };
  }
  return header;
});

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Most specific first: a path matching both gets both sets, and the
      // negative lookahead is what keeps /api/files out of the blanket rule
      // rather than leaving it with two conflicting X-Frame-Options.
      { source: "/api/files", headers: fileHeaders },
      { source: "/((?!api/files$).*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
