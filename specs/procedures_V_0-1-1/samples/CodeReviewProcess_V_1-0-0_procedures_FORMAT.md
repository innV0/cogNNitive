---
specification_version: "V_0-1-1"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/FORMAT_V_0-1-2_FORMAT.md"
level: 3
parent:
  name: "procedures_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/procedures_V_0-1-1_FORMAT.md"
model_version: "V_1-0-0"
title: "Code Review Process"
mode: "FILE"
---

> [!NOTE]
> This is a **FORMAT document** — a plain-text Markdown file that carries its own schema in the YAML frontmatter. The template definition is resolved via the parent chain and cached in the `specs/` directory.

# _F index

* _F index: Procedure
* _F index: Roles
* _F index: Work
* _F index: Artifacts
* _F index: Tools

# _F Procedure

Code review process for the engineering team at Acme Corp. Every pull request must go through at least one review before merging to main. The process covers both regular code changes and emergency hotfixes with an expedited path.

# _F Roles

* _F Roles: Author
  ```yaml
  scope: internal
  ```
  Developer who creates the PR. Responsible for addressing feedback and ensuring CI passes before requesting review.
* _F Roles: Reviewer
  ```yaml
  scope: internal
  ```
  Peer responsible for evaluating code quality, correctness, test coverage, and adherence to style guidelines.
* _F Roles: Maintainer
  ```yaml
  scope: internal
  ```
  Senior engineer with merge authority. Makes the final call on approvals and handles exceptions.

# _F Work

1. _F Work: Open Pull Request
   ```yaml
   step_type: event
   output: "Pull Request"
   tool: "GitHub"
   ```
   Author creates a PR with description, linked issue, and passing CI results.
2. _F Work: Assign Reviewer
   ```yaml
   step_type: task
   output: "Review Assignment"
   tool: "GitHub"
   ```
   Auto-assigned based on code ownership or team rotation schedule.
3. _F Work: Review Code
   ```yaml
   step_type: task
   input: "Pull Request"
   output: "Review Comments"
   tool: "GitHub"
   ```
   Reviewer checks: logic correctness, test coverage, style guidelines, security concerns.
4. _F Work: Approve or Request Changes
   ```yaml
   step_type: decision
   condition: "No blocking issues"
   next: "Merge"
   input: "Review Comments"
   ```
   If approved → proceed to merge. If changes requested → author addresses and re-requests review.
5. _F Work: Merge
   ```yaml
   step_type: event
   input: "Approved PR"
   output: "Merged PR"
   tool: "GitHub"
   ```
   Squash-merge to main. Source branch deleted automatically.

# _F Artifacts

* _F Artifacts: Pull Request
  GitHub PR with description, diff, discussion thread, and CI status.
* _F Artifacts: Review Checklist
  Standardized checklist covering correctness, performance, security, and style.
* _F Artifacts: Test Report
  Automated test and lint output attached to each PR commit.

# _F Tools

* _F Tools: GitHub
  PR management, code review, and merge platform.
* _F Tools: CI Pipeline
  Automated test and lint runners triggered on every PR commit and push.

# _F matrices: work-roles matrix

| Work \ Roles | Author | Reviewer | Maintainer |
| :--- | :---: | :---: | :---: |
| Open PR | Responsible | - | - |
| Assign Reviewer | - | - | Responsible |
| Review Code | Consulted | Responsible | Accountable |
| Approve or Request Changes | Informed | Consulted | Responsible |
| Merge | Informed | Informed | Accountable |
