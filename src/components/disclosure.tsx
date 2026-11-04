// The sponsor-disclosure layer. Every piece here is inert unless the site
// enables `features.sponsorDisclosure` — the two predicates below are the
// single gate, so a plain blog (the default) renders none of it.
//
// Why it lives in the shared package: a change to the disclosure wording or
// markup must land in ONE place and reach every blog that shows it, rather
// than being copied into each repo. The copy is deliberately brand-neutral
// (the package is published publicly): it names the site and the configured
// publisher entity, never a hard-coded product.

import type { PostFrontmatter } from "../content/types";
import type { SiteConfig, SponsorConfig } from "../site/schema";
import { classer } from "../theme/classes";

// The banner is site-wide: shown whenever the feature is on and a sponsor
// block is configured.
export function showSponsorBanner(site: Pick<SiteConfig, "features" | "sponsor">): boolean {
  return site.features.sponsorDisclosure && site.sponsor !== null;
}

// The per-post callout is required only when the post actually features a paid
// brand. A post with no paid placement shows nothing (the site-wide banner
// already carries the standing disclosure).
export function showPaidPlacement(
  site: Pick<SiteConfig, "features">,
  frontmatter: Pick<PostFrontmatter, "paidBrands">,
): boolean {
  return site.features.sponsorDisclosure && frontmatter.paidBrands.length > 0;
}

function joinBrands(brands: readonly string[]): string {
  if (brands.length === 0) return "";
  if (brands.length === 1) return brands[0]!;
  if (brands.length === 2) return `${brands[0]} and ${brands[1]}`;
  return `${brands.slice(0, -1).join(", ")}, and ${brands[brands.length - 1]}`;
}

// Site-wide disclosure banner. Per-session dismissible (sessionStorage); it
// fails to "stays shown", the compliance-safe direction, if storage throws.
export function DisclosureBanner({
  siteName,
  sponsor,
  classPrefix = "",
}: {
  siteName: string;
  sponsor: SponsorConfig;
  classPrefix?: string;
}) {
  const c = classer(classPrefix);
  return (
    <div className={c("disclosure-banner")} role="region" aria-label="Editorial disclosure" data-dismissible="true">
      <p>
        <span className={c("disclosure-site")}>{siteName}</span> includes paid partnerships with featured brands.
        Compensation may influence which products we highlight; it does not influence our editorial standards. See
        our <a href={sponsor.disclosurePath}>Disclosure Policy</a> for details.
      </p>
      <button
        type="button"
        className={c("disclosure-dismiss")}
        data-disclosure-dismiss=""
        aria-label="Dismiss disclosure banner for this session"
      >
        <span aria-hidden="true">&times;</span>
      </button>
      {/* Per-session dismissal with no framework dependency; a storage error
          leaves the banner shown (compliance-safe). Queries a stable data
          attribute, not the (prefixable) class name. */}
      <script
        dangerouslySetInnerHTML={{
          __html: BANNER_DISMISS_SCRIPT,
        }}
      />
    </div>
  );
}

// Inline, framework-free dismissal: hide the banner if this session already
// dismissed it, and wire the button. Kept tiny and self-contained so the
// banner needs no client bundle.
const BANNER_DISMISS_SCRIPT = `(function(){try{var b=document.currentScript.parentNode;var k="disclosure-banner-dismissed";if(sessionStorage.getItem(k)==="1"){b.style.display="none";return;}var x=b.querySelector("[data-disclosure-dismiss]");if(x){x.addEventListener("click",function(){try{sessionStorage.setItem(k,"1");}catch(e){}b.style.display="none";});}}catch(e){}})();`;

// Per-post paid-placement callout. Renders above the byline; `null` when the
// post has no paid brand (callers also gate on `showPaidPlacement`).
export function PaidPlacementCallout({
  paidBrands,
  otherBrands,
  disclosurePath,
  classPrefix = "",
}: {
  paidBrands: readonly string[];
  otherBrands?: readonly string[];
  disclosurePath: string;
  classPrefix?: string;
}) {
  if (paidBrands.length === 0) return null;
  const c = classer(classPrefix);
  const noun = paidBrands.length === 1 ? "a paid partner" : "paid partners";
  const hasOthers = (otherBrands?.length ?? 0) > 0;
  return (
    <aside className={c("disclosure-callout")} role="note" aria-label="Paid partnership disclosure">
      <p className={c("disclosure-label")}>Disclosure</p>
      <p>
        This article features {joinBrands(paidBrands)} as {noun}.
        {hasOthers ? ` We also reviewed ${joinBrands(otherBrands ?? [])} without any compensation arrangement.` : ""}{" "}
        See our <a href={disclosurePath}>Disclosure Policy</a> for our editorial integrity standards.
      </p>
    </aside>
  );
}

// The single footer attribution line: exactly ONE rel="nofollow sponsored"
// link to the publisher. A second link to this URL anywhere else would turn
// the attribution into a link-scheme footprint, so this is the only one.
export function SponsorAttribution({
  siteName,
  sponsor,
  classPrefix = "",
}: {
  siteName: string;
  sponsor: SponsorConfig;
  classPrefix?: string;
}) {
  const c = classer(classPrefix);
  return (
    <p className={c("sponsor-attribution")}>
      <span className={c("disclosure-site")}>{siteName}</span> is published by {sponsor.publisherEntity}.{" "}
      {sponsor.attributionText} —{" "}
      <a href={sponsor.attributionUrl} rel="nofollow sponsored noreferrer" target="_blank">
        {sponsor.attributionUrl.replace(/^https?:\/\//, "")}
      </a>
    </p>
  );
}
