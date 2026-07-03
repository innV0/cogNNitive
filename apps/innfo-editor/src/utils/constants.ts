/**
 * Current iNNfo specification version.
 * This is the SINGLE SOURCE OF TRUTH for the spec version.
 * Every other artifact (code, markdown, skills, models) MUST derive from this
 * constant or be validated against it by scripts/check-spec-version.ts.
 *
 * When bumping the spec version:
 *   1. Update DEFAULT_FORMAT_VERSION here.
 *   2. Run `npm run check:spec-version` — it will list every stale file.
 *   3. Update each stale file to match.
 *   4. Never duplicate this value as a hardcoded string elsewhere in .ts/.vue.
 */
export const DEFAULT_INNFO_VERSION = 'V_0-2-0';

/** Default template name for new documents. */
export const DEFAULT_TEMPLATE_NAME = 'business';

/** Default template version. */
export const DEFAULT_TEMPLATE_VERSION = 'V_1-0-0';

/** Maximum marker score value (scores range from 0 to this value). */
export const MAX_MARKER_SCORE = 3;

/** Number of marker states (0 through MAX_MARKER_SCORE). */
export const MARKER_CYCLE_COUNT = MAX_MARKER_SCORE + 1;

/**
 * Builds the canonical raw GitHub URL for an iNNfo specification version.
 * Use this instead of concatenating the URL by hand.
 *
 * The folder segment preserves the uppercase `V_x-y-z` form.
 */
export function buildSpecificationUrl(version: string = DEFAULT_INNFO_VERSION): string {
  // Convert V_0-1-5 → v0.1.5 for the git tag
  const tag = 'v' + version.slice(2).replace(/-/g, '.');
  return `https://raw.githubusercontent.com/innV0/cogNNitive/${tag}/specs/iNNfo_${version}_NN.md`;
}

/**
 * Canonical documentation location for a spec version.
 */
export function buildDocumentationLocation(version: string = DEFAULT_INNFO_VERSION): string {
  return `docs/spec/${version}/`;
}
