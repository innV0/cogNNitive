---
name: innv0-skill-lifecycle
description: >
  Trigger: manage skills, skill workflow, audit skills, skill lifecycle,
  organizar skills, skill maintenance, ciclo de vida skills, gestionar skills,
  poner en orden skills, revisar skills. HIGH-LEVEL WORKFLOW — delegates to
  skill-creator, skill-improver, nnskills-organizer, skill-registry, and
  skill-origin-guard. Use THIS instead of individual skills when the user
  wants full lifecycle management. For single tasks (create only, audit only,
  organize only) use the specific skill directly.
license: Apache-2.0
compatibility: opencode
metadata:
  source: cogNNitive
  version: "1.0"
  audience: maintainer
  workflow: skills
---

# iNNv0 Skill Lifecycle

## Activation Contract

Load this skill when the user talks about **managing, organizing, creating, auditing, or maintaining agent skills** at a broad level — not when they ask for a single atomic task.

Keywords: manage skills, skill workflow, lifecycle, organise/organizar skills,
poner en orden, revisar skills, skill maintenance, skill audit, skill cleanup.

Do NOT load this for single-task requests like "create a skill for X",
"audit this skill", or "organize the skills folder" — those should go
directly to `skill-creator`, `skill-improver`, or `nnskills-organizer`.

## Purpose

Single entry point for the full skill lifecycle in this project.
Assess what the user needs, delegate to the right specialist skill,
then post-process (registry update, consistency check).

## Workflow

### Step 1: Assess

Ask ONE question to determine scope:

> ¿Querés crear un skill nuevo, auditar/mejorar uno existente,
> organizar la estructura de skills, o es un mantenimiento general?

Or in English:

> Do you want to create a new skill, audit/improve an existing one,
> reorganize the skills structure, or general maintenance?

Map the answer:

| User says | Delegate to |
|-----------|-------------|
| Create new (with eval) | `skill-creator` (anthropic/skills) |
| Create new (simple/scaffold) | `write-a-skill` (mattpocock/skills) |
| Audit / improve quality | `skill-improver` |
| Reorganize / standardize layout | `nnskills-organizer` |
| General maintenance / review all | Run Steps 2-3 |
| Fix origin metadata | `skill-origin-guard` |

### Step 2: Run Full Assessment (maintenance mode)

When the user asks for general maintenance:

1. Check current skill count: read `.atl/skill-registry.md` or run `skill-registry`
2. Identify orphaned or unused skills
3. Check frontmatter compliance on all skills
4. Check registry is up to date

### Step 3: Delegate

Launch the appropriate sub-agent(s) from the table above.
Pass exact SKILL.md paths from the registry to each sub-agent.

### Step 4: Post-process

After delegated work returns:

1. Run `skill-registry` to regenerate `.atl/skill-registry.md` and persist to Engram
2. Report summary to user:
   - What was done
   - New skill count (if changed)
   - Any remaining action items

## Hard Rules

- Do NOT load this skill alongside `skill-creator`, `skill-improver`,
  `nnskills-organizer`, or `skill-registry` in the same context.
  Choose ONE path per session.
- Always update the registry after any skill creation, move, rename, or deletion.
- Never modify a `SKILL.md` directly — delegate to the appropriate specialist.

## References

- `.atl/skill-registry.md` — current skill index
- `~/.config/opencode/skills/skill-creator/SKILL.md` — create with eval
- `~/.config/opencode/skills/skill-improver/SKILL.md` — audit & fix
- `~/.agents/skills/nnskills-organizer/SKILL.md` — structure & migration
- `~/.config/opencode/skills/skill-registry/SKILL.md` — index maintenance
- `~/.config/opencode/skills/skill-origin-guard/SKILL.md` — metadata compliance
