/**
 * FORMAT versioning & file-naming helpers (spec V_0-1-5 §8).
 *
 * Every version string in the FORMAT ecosystem uses Semantic Versioning,
 * rendered with a `V_` prefix and hyphen separators instead of dots:
 *   V_MAJOR-MINOR-PATCH   (e.g. V_0-1-5)
 *
 * A FORMAT-compliant file name MUST end with `_F.md` (§8.1):
 *   - Model document:    <ModelName>_V_x-y-z_<TemplateName>_F.md
 *   - Template/Spec:     <Name>_V_x-y-z_F.md
 *   - Old Model format:  <ModelName>_BM_V_x-y-z_F.md
 */

export type BumpLevel = 'major' | 'minor' | 'patch';

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export interface ParsedFormatName {
  /** The <Name> segment preceding the version. */
  baseName: string;
  /** True when the name carries the `_business` or `_BM` marker. */
  isBusinessModel: boolean;
  /** The template name if present (e.g. 'business' or 'procedures'). */
  templateName?: string;
  /** The document's own version. */
  version: SemVer;
}

/** Renders a SemVer as the FORMAT version string, e.g. `V_0-1-5`. */
export function formatVersionString(v: SemVer): string {
  return `V_${v.major}-${v.minor}-${v.patch}`;
}

/**
 * Parses a FORMAT-compliant file name into its parts.
 * Returns null when the name does not match the §8.1 convention.
 */
export function parseFormatFilename(fileName: string): ParsedFormatName | null {
  // 1. Try New: <ModelName>_V_x-y-z_<TemplateName>_F.md
  const newMatch = fileName.match(/^(.+?)_V_(\d+)-(\d+)-(\d+)(?:_(.+?))?_F\.md$/);
  if (newMatch) {
    const templateName = newMatch[5];
    return {
      baseName: newMatch[1],
      isBusinessModel: templateName === 'business' || templateName === 'BM',
      templateName: templateName,
      version: {
        major: Number(newMatch[2]),
        minor: Number(newMatch[3]),
        patch: Number(newMatch[4])
      }
    };
  }

  // 2. Try Old: <ModelName>_BM_V_x-y-z_F.md
  const oldMatch = fileName.match(/^(.+?)_BM_V_(\d+)-(\d+)-(\d+)_F\.md$/);
  if (oldMatch) {
    return {
      baseName: oldMatch[1],
      isBusinessModel: true,
      templateName: 'business',
      version: {
        major: Number(oldMatch[2]),
        minor: Number(oldMatch[3]),
        patch: Number(oldMatch[4])
      }
    };
  }

  return null;
}

/** Builds a FORMAT-compliant file name from its parts (§8.1). */
export function buildFormatFilename(
  baseName: string,
  templateName: string | undefined,
  version: SemVer
): string {
  const suffix = templateName ? `_${templateName}` : '';
  return `${baseName}_V_${version.major}-${version.minor}-${version.patch}${suffix}_F.md`;
}

/** Returns a new SemVer with the requested level incremented (§8.2 SemVer rules). */
export function bumpVersion(v: SemVer, level: BumpLevel): SemVer {
  switch (level) {
    case 'major':
      return { major: v.major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major: v.major, minor: v.minor + 1, patch: 0 };
    case 'patch':
      return { major: v.major, minor: v.minor, patch: v.patch + 1 };
  }
}
