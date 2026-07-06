# iNNfo Specification — v0.1.0

**Status**: Active  
**Published**: 2026-07-06  
**Spec directory**: `specs/v0.1.0/`

This is the first versioned release of the iNNfo specification ecosystem. All specifications in this directory are frozen and immutable.

## Spec Files

| File | Level | Role |
|---|---|---|
| [`level0/defiNNe_V_0-1-0_NN.md`](level0/defiNNe_V_0-1-0_NN.md) | 0 | Meta-specification — defines structure, versioning, parent chain |
| [`level1/iNNfo_V_0-1-0_NN.md`](level1/iNNfo_V_0-1-0_NN.md) | 1 | Concrete specification — concepts, markers, matrices |
| [`level2/business/business_V_0-1-1_NN.md`](level2/business/business_V_0-1-1_NN.md) | 3 | Business strategy template |
| [`level2/procedures/procedures_V_0-1-1_NN.md`](level2/procedures/procedures_V_0-1-1_NN.md) | 3 | Workflow procedures template |
| [`level2/catalog/catalog_V_0-1-2_NN.md`](level2/catalog/catalog_V_0-1-2_NN.md) | 3 | Knowledge catalog template (FOLDER mode) |

## Parent Chain

```
defiNNe_V_0-1-0 (level 0 — level0/)
  └── iNNfo_V_0-1-0 (level 1 — level1/)
        ├── business_V_0-1-1 (level 2 — level2/business/)
        ├── procedures_V_0-1-1 (level 2 — level2/procedures/)
        └── catalog_V_0-1-2 (level 2 — level2/catalog/)
              └── (level 3 models in samples/)
```

## Samples

- [`level2/business/samples/Ghostbusters_V_0-1-2_business_FORMAT.md`](level2/business/samples/Ghostbusters_V_0-1-2_business_FORMAT.md)
- [`level2/procedures/samples/CodeReviewProcess_V_1-0-0_procedures_NN.md`](level2/procedures/samples/CodeReviewProcess_V_1-0-0_procedures_NN.md)
- [`level2/catalog/samples/Music_History_V_1-0-0_catalog/`](level2/catalog/samples/Music_History_V_1-0-0_catalog/)

## Consumer Notes

```yaml
# Canonical immutable URL (v0.1.0 — use after git tag v0.1.0 is created):
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.0/specs/v0.1.0/level1/iNNfo_V_0-1-0_NN.md"

# Working URL (main branch — changes if repo is restructured):
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/v0.1.0/level1/iNNfo_V_0-1-0_NN.md"

# Stable alias (always the latest version):
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/latest/level1/iNNfo_NN.md"
```

> **Note**: When the next version (e.g. v0.2.0) is published, this directory and all its contents remain frozen. Create a git tag `v0.1.0` to freeze these URLs permanently.
