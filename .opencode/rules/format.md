# FORMAT Agent Rules — Behavior Only

These rules describe **workflow and tool usage only**. No FORMAT specification content is copied here — call `get_spec` / `get_template` to learn the current FORMAT rules for any given model version.

## Tool Workflow

1. **To inspect existing models**: use `list_models` to find models, then `read_model` to inspect a model's structure.
2. **To learn FORMAT rules**: call `get_spec` with the model's version, or `get_template` with the template name (e.g. `business`, `procedures`). Do NOT assume FORMAT rules from memory — always fetch.
3. **To edit a model**: use `apply_change` with an intent operation (`add_concept`, `add_field`, `set_marker`, `add_element`, `remove_element`). `apply_change` validates automatically.
4. **To validate after any manual edit**: always call `validate_model`. If `errors[]` is non-empty, fix and re-validate before reporting success.
5. **To add new elements with fields**: use `add_element` with a `fields` object in args, e.g. `{ "conceptName": "Stakeholders", "elementName": "New Stakeholder", "fields": { "role": "founder" } }`.

## Validation Rules

- **Validation is deterministic.** The `format-core` validator decides validity — never claim a model is valid without calling `validate_model` or `apply_change`.
- **Self-correction loop**: on errors, fix the issues and re-validate. Repeat until `valid: true` or you cannot resolve the errors.
- **`apply_change` rejects invalid**: if `apply_change` returns `{ success: false, errors: [...] }`, the file was NOT modified. Fix and retry.

## FILE vs FOLDER

- Both modes are handled transparently by the MCP tools. Pass a model `id` — the server dispatches to the correct driver internally.
- Most models today use `mode: FILE` (single `_F.md` file). `FOLDER` mode is deprecated in V_0-1-3.

## Naming / SemVer

- FORMAT filenames include a version marker: `..._V_MAJOR-MINOR-PATCH_...` (e.g. `Ghostbusters_V_0-1-2_business_F.md`).
- The agent calls `get_spec` or `get_template` with the resolved version — do NOT hardcode version numbers.

## Multi-turn

- After each edit, summarize the change and its validation result.
- If the user's request is ambiguous, use the tools to inspect the current model state before proposing changes.
