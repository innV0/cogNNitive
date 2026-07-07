# innfo-mcp — Publisher-agnostic spec/template resolution

## Context

The `innfo-mcp` server wraps `@innv0/innfo-core` and MUST be agnostic of any spec publisher. An iNNfo model is self-describing: its frontmatter declares `spec_url` and `parent_spec.url`, which are the single source of truth for resolution. The server stores no spec/template URLs or template names as constants. A spec or template is resolved only from a URL supplied by the caller or derived from a loaded model's `parent_spec.url`.

Resolution runs through `resolveParentChain` (innfo-core), which walks the self-describing parent chain up to level 0, resolving each document from a local `specs/` directory, then a local cache, then the network.

## Requirements

### Requirement: `getTemplateFromUrl` resolves a template from a URL

The system MUST provide `getTemplateFromUrl(rootDir, url, name)` that resolves a template document directly from a given URL, without any internal name map or base URL.

#### Scenario: Model with valid parent_spec.url

- GIVEN a URL pointing to a reachable level-2 template document
- WHEN `getTemplateFromUrl` is called with that URL and a chain-start name
- THEN it calls `resolveParentChain(url, name, cacheDir)` directly
- AND returns the `SpecDocument` from `coreGetTemplate(cache)`

#### Scenario: `coreGetTemplate` returns undefined (fallback to direct file read)

- GIVEN a URL that resolves via `resolveParentChain` but `coreGetTemplate` returns undefined
- WHEN `getTemplateFromUrl` is called
- THEN it reads the cached file at `.spec-cache/{name}_NN.md`, parses its frontmatter, and returns a `SpecDocument` built from it

#### Scenario: Unreachable URL or timeout

- GIVEN a URL that 404s or times out
- WHEN `getTemplateFromUrl` is called
- THEN `resolveParentChain` throws, the error is caught, and the function returns `null`

### Requirement: `get_spec` resolves from URL or model, never from a constant

The `get_spec` tool MUST accept either an explicit `url` or a `model_id`, and MUST NOT construct any URL from an internal base constant. No `SPEC_BASE_URL` exists.

#### Scenario: Explicit URL supplied

- GIVEN a caller passes `url` pointing to a level-1 (or level-2) spec document
- WHEN `get_spec` is invoked
- THEN it resolves the parent chain from that URL and returns the level-1 spec via `getFormatSpec(cache)`

#### Scenario: Derived from a loaded model

- GIVEN a caller passes `model_id` for a model whose frontmatter declares `parent_spec.url`
- WHEN `get_spec` is invoked with no explicit `url`
- THEN it reads the model, extracts `parent_spec.url`, resolves the chain, and returns the level-1 spec

#### Scenario: Neither url nor model_id

- GIVEN a caller passes neither `url` nor `model_id`
- WHEN `get_spec` is invoked
- THEN it returns `{ spec: null, specCache: null }` and the tool handler returns an error instructing the caller to supply `url` or `model_id`; no network request is attempted

### Requirement: `get_template` resolves from URL or model, never from a name map

The `get_template` tool MUST accept either an explicit `url` or a `model_id`. It MUST NOT accept a bare template `name` resolved against an internal map. No `TEMPLATE_SPECS` exists.

#### Scenario: Explicit template URL supplied

- GIVEN a caller passes `url` pointing to a level-2 template document
- WHEN `get_template` is invoked
- THEN it calls `getTemplateFromUrl(rootDir, url, name ?? deriveNameFromUrl(url))` and returns the template

#### Scenario: Derived from a loaded model's parent_spec.url

- GIVEN a caller passes `model_id` for a model whose `parent_spec.url` points to its template
- WHEN `get_template` is invoked with no explicit `url`
- THEN it reads the model, extracts `parent_spec.url`/`parent_spec.name`, and returns `getTemplateFromModel`'s result

#### Scenario: Neither url nor model_id

- GIVEN a caller passes neither `url` nor `model_id`
- WHEN `get_template` is invoked
- THEN it returns an error instructing the caller to supply `url` or `model_id`

### Requirement: `validateModel` resolves the template only from the model

The `validateModel()` function MUST resolve the template exclusively via `getTemplateFromUrl(rootDir, parent_spec.url, parentName)`, or from an explicit `templateUrl` argument. No name-based fallback exists.

#### Scenario: Model with resolvable parent_spec.url

- GIVEN a model whose `parent_spec.url` and `parent_spec.name` are set
- WHEN `validateModel` is called
- THEN it resolves the template from `parent_spec.url` and passes it to `coreValidate`

#### Scenario: Model without a resolvable parent_spec.url

- GIVEN a model with no resolvable `parent_spec.url` and no `templateUrl` argument
- WHEN `validateModel` is called
- THEN `template` remains `null`, validation proceeds structurally, and the result includes a warning: "No template resolved; structural validation only"

#### Scenario: Explicit templateUrl provided

- GIVEN a model with no `parent_spec.url` but the caller supplies `templateUrl`
- WHEN `validateModel` is called
- THEN it resolves the template from `templateUrl` via `getTemplateFromUrl`

### Requirement: `applyChange` resolves the template only from the model

The `applyChange()` function MUST resolve the post-mutation template exclusively via `getTemplateFromUrl(rootDir, parent_spec.url, parentName)`. No name-based fallback exists.

#### Scenario: applyChange re-validates via parent_spec.url

- GIVEN a model with `parent_spec.url` and `parent_spec.name` set
- WHEN `applyChange` mutates the model
- THEN it resolves the template from `parent_spec.url` before re-validating
- AND rejects-without-writing when validation fails
