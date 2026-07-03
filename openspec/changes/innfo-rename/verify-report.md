# Verify Report: innfo-rename

**Date**: 2026-07-03  
**Branch**: `innfo/code-rename`  
**Base**: `93a8ab9` (chore: checkpoint pre-innfo-rename)  
**Commits evaluated**: 6 (0e6ce84 → ee8ccd5)

---

## Overall Verdict: FAIL

The code migration (parser regex, constants, editor source) is **correct** but **incomplete**. The two critical spec deliverables are missing, and test migration is partial. The rename is not ready for merge.

---

## CRITICAL Issues (expected: 0, found: 4)

### C1: `specs/iNNfo_V_0-2-0_NN.md` does not exist ❌

The new spec file is a **mandatory deliverable** per spec R1, S1, and Phase 7 Task 7.1. It was created in commit `fb3da84` on a separate branch but was **never merged** into `innfo/code-rename`. The current branch has no `_NN.md` spec file.

| Check | Status |
|-------|--------|
| File exists at `specs/iNNfo_V_0-2-0_NN.md` | ❌ |
| Original `specs/FORMAT_V_0-1-5_F.md` unmodified | ✅ |

### C2: `specs/defiNNe_V_0-1-1_NN.md` does not exist ❌

Per spec R2, S2, and design §1: the `defiNNe` spec **must be migrated** to `_NN.md` because `resolveParentChain()` consumes it. The old `specs/defiNNe_V_0-1-1_F.md` still exists unchanged.

| Check | Status |
|-------|--------|
| File `specs/defiNNe_V_0-1-1_NN.md` exists | ❌ |
| Old `specs/defiNNe_V_0-1-1_F.md` untouched | ✅ (not migrated — should have been renamed) |
| Legacy `specs/defiNNe_V_0-1-0_FORMAT.md` untouched | ✅ |

### C3: Editor tests not fully migrated to `_NN` markers ❌

Commit `712a11f` ("test(innfo): update editor tests for _NN marker convention") updated only **6 of ~20** test files:

**Updated**: `validator.test.ts`, `recursiveSerializer.test.ts`, `crlf-fidelity.golden.test.ts`, `recursiveParser.models.golden.test.ts`, `roundtrip.models.golden.test.ts`, `roundtrip.synthetic.golden.test.ts`

**NOT updated** (still use `# _F`, `* _F`, `_F.md` markers):

| Test file | Stale `_F` markers |
|-----------|-------------------|
| `tests/unit/recursiveParser.test.ts` | ~25+ (`# _F`, `* _F Concept:`, `_F.md` filenames) |
| `tests/unit/file-system-ops.test.ts` | ~12 (`# _F`, `_F.md` URLs, `_F.md` in assertions) |
| `tests/unit/workspaceStore.test.ts` | ~6 (`# _F`, `[[Doc_F.md]]`) |
| `tests/unit/workspaceStore-session.test.ts` | ~6 (`# _F`, `[[..._F.md]]`) |
| `tests/unit/metamodelStore-taxonomy.test.ts` | ~5 (`TAXONOMY_FM` constant) |
| `tests/progressive-smoke.test.ts` | ~20+ (`# _F`, `* _F`, `_F.md` in content) |
| `tests/integration/catalog.integration.test.ts` | ~12 (`# _F`, `* _F`, `_F.md` wikilinks) |
| `tests/integration/workspace.integration.test.ts` | ~8 (`# _F`, `_F.md` references) |
| `tests/golden/recursiveParser.models.golden.test.ts` | Snapshot data references `_F.md` paths |

These cause **~28 direct test failures** — the parser only recognizes `_NN` markers, so inline test content with `_F` returns empty parse results.

### C4: Legacy fixture golden tests fail with `_NN`-only parser ❌

The V_0-2-0 parser only recognizes `_NN` markers. The 7 legacy fixture files in `apps/innfo-editor/tests/fixtures/models/*_F.md` use `_F` markers. Golden tests that parse these fixtures get **empty results** (`nodeCount: 0`, `nodes: []`).

Affected golden tests: 8 snapshot mismatches in `recursiveParser.models.golden.test.ts` and `roundtrip.models.golden.test.ts`.

This exposes a **design-level tension** (spec S7): should the parser gracefully handle legacy `_F.md` files, or does the rename fully break backward compat? Currently it fully breaks compat.

---

## WARNING Issues

### W1: Stale comments in editor source code

| File | Line | Content |
|------|------|---------|
| `apps/innfo-editor/src/utils/version.ts` | 43 | `// 1. Try New: ..._F.md` (comment should say `_NN.md`) |
| `apps/innfo-editor/src/utils/version.ts` | 59 | `// 2. Try Old: ..._F.md` (comment should say `_NN.md`) |
| `apps/innfo-editor/src/utils/constants.ts` | 8 | `*   1. Update DEFAULT_FORMAT_VERSION here.` (variable name is now `DEFAULT_INNFO_VERSION`) |

### W2: UI still shows "Format:" label in Header.vue

Line 13: `<span>Format:</span>` — should be `iNNfo:` for consistency with the badge (`_NN`) and title (`iNNfo Modeler`).

### W3: Pre-existing test environment issues (~25 failures)

The following test failures are **not related to the rename** but exist in the environment:

| Root cause | Count | Affected files |
|------------|-------|----------------|
| `ReferenceError: indexedDB is not defined` | ~12 | `db.test.ts`, `workspaceStore.test.ts`, `workspaceStore-session.test.ts`, `file-system-ops.test.ts` |
| `ReferenceError: window is not defined` | ~13 | `file-system-ops.test.ts` |

These tests require `indexedDB` or `window` APIs but the test environment (`happy-dom` in vitest) does not provide them. Missing setup mocks.

### W4: `@innv0/innfo-core` exports config has dangling reference

The `package.json` exports field includes a `types` path (`./dist/types`) that does not exist as a file. Direct `import` via Node.js ESM fails:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../packages/innfo-core/dist/types'
```

This is a pre-existing issue in the exports map, not related to the rename. It does not affect Vite/tsup builds (they resolve differently).

---

## SUGGESTIONS

1. **Create `specs/iNNfo_V_0-2-0_NN.md`** — cherry-pick commit `fb3da84` from `dev`, or re-generate by copying `FORMAT_V_0-1-5_F.md` and applying the migration transforms.

2. **Create `specs/defiNNe_V_0-1-1_NN.md`** — rename `defiNNe_V_0-1-1_F.md` → `_NN.md`, update frontmatter and markers per spec R2.

3. **Complete editor test migration** — the ~14 remaining test files need inline `_F`→`_NN` replacements. Use a targeted sed/regex approach:
   - Model content strings: `# _F` → `# _NN`, `* _F` → `* _NN`
   - Test filenames: `_F.md` → `_NN.md` (but not legacy fixture paths)

4. **Decide on legacy `_F.md` fixture strategy** — Either:
   - Add a legacy-compat mode to the parser (per S7 option)
   - Update test snapshots to expect empty/null results for legacy files
   - Or fully migrate fixture files (out of scope per spec)

5. **Fix stale comments** in `version.ts` (lines 43, 59) and `constants.ts` (line 8).

6. **Fix "Format:" label** in `Header.vue` line 13.

7. **Add `fake-indexeddb` to test setup** to fix ~12 pre-existing `indexedDB` failures.

---

## Test Results

### Core tests (`packages/innfo-core/tests/`)

| Check | Result |
|-------|--------|
| `npx vitest run packages/innfo-core/tests/` | ✅ **47/47 pass** (2 files) |

### Editor tests (`apps/innfo-editor/tests/`)

| Check | Result |
|-------|--------|
| `npx vitest run apps/innfo-editor/tests/` | ❌ **75/128 pass, 53 fail** (37 files, 27 failing) |

**Breakdown of 53 failures:**

| Category | Count | Cause |
|----------|-------|-------|
| `ReferenceError: indexedDB is not defined` | 12 | Pre-existing — missing test env setup |
| `ReferenceError: window is not defined` | 13 | Pre-existing — missing test env setup |
| Inline `_F` markers not migrated to `_NN` | ~20 | **Rename-related** — test content strings still use `_F` |
| Golden snapshot mismatches (legacy `_F.md` fixtures) | 8 | **Rename-related** — parser returns empty for `_F` files |

**Rename-related failures: ~28**  
**Pre-existing failures: ~25**

---

## Build Results

| Package | Command | Result |
|---------|---------|--------|
| `packages/innfo-core` | `npm run build` (tsc) | ✅ Compiles without errors |
| `packages/innfo-mcp` | `npm run build` (tsup) | ✅ Builds successfully |
| `apps/innfo-editor` | `npm run build` (vue-tsc --noEmit && vite build) | ✅ Builds successfully |

---

## Stale Reference Audit

### `packages/innfo-core/src/` ✅ **Clean**

All `_F` matches are non-FORMAT references:

| Match | Meaning | Verdict |
|-------|---------|---------|
| `YAML_FENCE_RE` | YAML frontmatter fence pattern | ✅ Legitimate — unrelated to FORMAT markers |
| `VERSION_FILENAME_RE` | Version string in filename | ✅ Legitimate — unrelated to FORMAT markers |

### `packages/innfo-mcp/src/` ✅ **Clean**

All `_F` matches are legacy URL references:

| Match | Verdict |
|-------|---------|
| `business_V_0-1-1_FORMAT.md` (×1) | ✅ Legacy template spec URL |
| `procedures_V_0-1-1_FORMAT.md` (×1) | ✅ Legacy template spec URL |
| `catalog_V_0-1-2_FORMAT.md` (×1) | ✅ Legacy template spec URL |

### `apps/innfo-editor/src/` ⚠️ **Minor stale comments**

| Match | Verdict |
|-------|---------|
| `version.ts:43` — `_F.md` in comment | ⚠️ Stale JSDoc comment |
| `version.ts:59` — `_F.md` in comment | ⚠️ Stale JSDoc comment |
| `constants.ts:8` — `DEFAULT_FORMAT_VERSION` | ⚠️ Stale comment |
| `HomeView.vue:29,45` — `_F.md` in sample paths | ✅ Legacy fixture references |

### `specs/` **Legacy content only** ✅

All `_F` matches are in:
- Frozen legacy spec files (`*_FORMAT.md`, `*_F.md`) — out of scope
- Historical CHANGELOG entries — preserved intentionally

### `tests/fixtures/` and `specs/*/samples/` ✅ **Protected**

All legacy fixture files with `_F.md` suffix are **unmodified**:

| Location | Files |
|----------|-------|
| `tests/fixtures/` | 7 `*_F.md` model files |
| `specs/business_V_0-1-1/samples/` | `Ghostbusters_V_0-1-2_business_F.md` |
| `specs/procedures_V_0-1-1/samples/` | `CodeReviewProcess_V_1-0-0_procedures_F.md` |

### `docs/cogNNitive/` ✅ **Protected**

- `docs/cogNNitive/_F.md` — unmodified ✅
- `docs/cogNNitive/launcher/_F.md` — unmodified ✅

---

## Package Resolution

| Package | Resolves to | Status |
|---------|-------------|--------|
| `@innv0/innfo-core` | `packages/innfo-core/` | ✅ Correct (package.json name matches) |
| `@innv0/innfo-mcp` | `packages/innfo-mcp/` | ✅ Correct (dep on `@innv0/innfo-core` resolves) |
| `@innv0/innfo-editor` | `apps/innfo-editor/` | ✅ Correct (dep on `@innv0/innfo-core` resolves) |

---

## Verification Gate Summary

| Gate | Status | Notes |
|------|--------|-------|
| **Gate A** (Package infra) | ✅ Pass | 3 dir renames + 3 package.json changes correct |
| **Gate B** (Core + core tests) | ✅ Pass | `tsc` succeeds, 47/47 tests pass, no stale `_F` in src/ |
| **Gate C** (MCP + Editor + tests) | ❌ Fail | Build OK, but 28 rename-related test failures |
| **Gate D** (Spec files) | ❌ Fail | `iNNfo_V_0-2-0_NN.md` and `defiNNe_V_0-1-1_NN.md` missing |
| **Gate E** (Final) | ❌ Fail | Tests fail, spec deliverables incomplete |

---

## Verdict

```
CRITICAL: 4
WARNINGS: 4
SUGGESTIONS: 7
VERDICT: FAIL
```

The rename is **partially complete**: the code migration (parser, validator, editor components) is correct and builds successfully. However, **spec deliverables are missing** and **editor test migration is incomplete**, causing 28 test failures. The two missing spec files (`iNNfo_V_0-2-0_NN.md` and `defiNNe_V_0-1-1_NN.md`) block the rename from being functional.
