# Skill Registry — cogNNitive

<!-- Auto-generated. Run gentle-ai skill-registry refresh --force to regenerate. -->

Last updated: 2026-07-03

## Sources scanned

- C:\Users\lucas\.agents\skills (user canonical, innV0-authored only)
- C:\Users\lucas\.config\opencode\skills (SDD workflow)
- C:\Users\lucas\.claude\skills (junction -> .config\opencode)
- C:\Users\lucas\.gemini\skills (junction -> .config\opencode)

## Contract

**Single source of truth:** ~\.agents\skills\ for user-authored skills, ~\.config\opencode\skills\ for SDD workflow.
External skills are NOT pre-installed. Install on demand via inference.sh or find-skills when needed.

## Skills

| Skill | Trigger / description | Scope | Path |
| --- | --- | --- | --- |
| nydeo-script-builder | Specialist in Anydeo V_0-3-3 script syntax and visual effects. | user | C:\Users\lucas\.agents\skills\anydeo-script-builder\SKILL.md |
| innv0-format | innV0 FORMAT model authoring and validation. | user | C:\Users\lucas\.agents\skills\innv0-format\SKILL.md |
| innv0-opencode-model-router | On-demand model adequacy evaluator for OpenCode. | user | C:\Users\lucas\.agents\skills\innv0-opencode-model-router\SKILL.md |
| innv0-skills-manager | Meta-skill for managing iNNv0 skills. Scans, cross-references, installs. | user | C:\Users\lucas\.agents\skills\innv0-skills-manager\SKILL.md |
| innv0-trannsform | Bootstrap projects, scan raw documents, normalize to Markdown. | user | C:\Users\lucas\.agents\skills\innv0-trannsform\SKILL.md |
| innv0-web-design-guide | Light-mode design system with Morado Nazareno brand palette. | user | C:\Users\lucas\.agents\skills\innv0-web-design-guide\SKILL.md |
| 
nskills-organizer | Audit, reorganize, and standardize skills to agentskills.io standard. | user | C:\Users\lucas\.agents\skills\nnskills-organizer\SKILL.md |
| acklog-sdd | Manage prioritized backlog that feeds into SDD. | user | C:\Users\lucas\.config\opencode\skills\backlog-sdd\SKILL.md |
| ranch-pr | Create pull requests with issue-first checks. | user | C:\Users\lucas\.config\opencode\skills\branch-pr\SKILL.md |
| chained-pr | Split oversized changes into chained PRs. | user | C:\Users\lucas\.config\opencode\skills\chained-pr\SKILL.md |
| cognitive-doc-design | Design docs that reduce cognitive load. | user | C:\Users\lucas\.config\opencode\skills\cognitive-doc-design\SKILL.md |
| comment-writer | Write warm, direct collaboration comments. | user | C:\Users\lucas\.config\opencode\skills\comment-writer\SKILL.md |
| go-testing | Focused Go testing patterns. | user | C:\Users\lucas\.config\opencode\skills\go-testing\SKILL.md |
| issue-creation | Create issues with issue-first checks. | user | C:\Users\lucas\.config\opencode\skills\issue-creation\SKILL.md |
| judgment-day | Blind dual review, fix, then re-judge. | user | C:\Users\lucas\.config\opencode\skills\judgment-day\SKILL.md |
| sdd-apply | Implement SDD tasks from specs and design. | user | C:\Users\lucas\.config\opencode\skills\sdd-apply\SKILL.md |
| sdd-archive | Archive completed SDD change. | user | C:\Users\lucas\.config\opencode\skills\sdd-archive\SKILL.md |
| sdd-design | Create technical design from proposals. | user | C:\Users\lucas\.config\opencode\skills\sdd-design\SKILL.md |
| sdd-explore | Explore ideas before committing to a change. | user | C:\Users\lucas\.config\opencode\skills\sdd-explore\SKILL.md |
| sdd-init | Bootstrap SDD context and config. | user | C:\Users\lucas\.config\opencode\skills\sdd-init\SKILL.md |
| sdd-onboard | Walk through SDD on the real codebase. | user | C:\Users\lucas\.config\opencode\skills\sdd-onboard\SKILL.md |
| sdd-propose | Create change proposals from explorations. | user | C:\Users\lucas\.config\opencode\skills\sdd-propose\SKILL.md |
| sdd-spec | Write delta specs with requirements. | user | C:\Users\lucas\.config\opencode\skills\sdd-spec\SKILL.md |
| sdd-tasks | Break specs into implementation tasks. | user | C:\Users\lucas\.config\opencode\skills\sdd-tasks\SKILL.md |
| sdd-verify | Validate implementation against specs. | user | C:\Users\lucas\.config\opencode\skills\sdd-verify\SKILL.md |
| skill-creator | Create LLM-first skills with valid frontmatter. | user | C:\Users\lucas\.config\opencode\skills\skill-creator\SKILL.md |
| skill-improver | Audit and upgrade existing LLM-first skills. | user | C:\Users\lucas\.config\opencode\skills\skill-improver\SKILL.md |
| skill-origin-guard | Ensure origin metadata in SKILL.md frontmatter. | user | C:\Users\lucas\.config\opencode\skills\skill-origin-guard\SKILL.md |
| skill-registry | Index available skills by trigger and path. | user | C:\Users\lucas\.config\opencode\skills\skill-registry\SKILL.md |
| work-unit-commits | Plan commits as reviewable work units. | user | C:\Users\lucas\.config\opencode\skills\work-unit-commits\SKILL.md |
| _shared | Shared SDD references (not invokable). | user | C:\Users\lucas\.config\opencode\skills\_shared\SKILL.md |

## Project-level skills (versioned in repos)

| Repo | Skill | Path |
| --- | --- | --- |
| cogNNitive | innv0-skill-lifecycle | D:\Users\lucas\Documents\GitHub\innV0\cogNNitive\.agents\skills\innv0-skill-lifecycle\SKILL.md |
| cogNNitive | spec-version-propagator | D:\Users\lucas\Documents\GitHub\innV0\cogNNitive\.agents\skills\spec-version-propagator\SKILL.md |
| FORMAT | innv0-format | D:\Users\lucas\Documents\GitHub\innV0\FORMAT\.agents\skills\innv0-format\SKILL.md |
| FORMAT | _FORMAT-source-incorporator | D:\Users\lucas\Documents\GitHub\innV0\FORMAT\.agents\skills\_FORMAT-source-incorporator\SKILL.md |
| modeliNNg | business-analysis | D:\Users\lucas\Documents\GitHub\innV0\modeliNNg\.agents\skills\business-analysis\SKILL.md |
| modeliNNg | format-skill | D:\Users\lucas\Documents\GitHub\innV0\modeliNNg\.agents\skills\format-skill\SKILL.md |
| modeliNNg | model-generator | D:\Users\lucas\Documents\GitHub\innV0\modeliNNg\.agents\skills\model-generator\SKILL.md |
| SkillsMaNNager | skills-mannager | D:\Users\lucas\Documents\GitHub\innV0\SkillsMaNNager\.agents\skills\skills-mannager\SKILL.md |

## Loading protocol

1. Match task context and target files against the Trigger / description column.
2. Pass only the matching Path values to the subagent under ## Skills to load before work.
3. Instruct the subagent to read those exact SKILL.md files before work.
4. If no matching skill exists, proceed without project skill injection and report skill_resolution: none.
