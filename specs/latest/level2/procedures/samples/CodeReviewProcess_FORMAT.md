---
specification_version: "V_0-1-0"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/v0.1.0/level1/iNNfo_V_0-1-0_NN.md"
level: 3
parent_spec:
  name: "procedures_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/v0.1.0/level2/procedures/procedures_V_0-1-1_NN.md"
model_version: "V_1-0-0"
title: "Code Review Process"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file that carries its own schema in the YAML frontmatter. The template definition is resolved via the parent chain and cached in the `specs/` directory.

# _NN index

* _NN index: Procedure
* _NN index: Roles
* _NN index: Work
* _NN index: Artifacts
* _NN index: Tools

# _NN Procedure

Code review process for the engineering team at Acme Corp. Every pull request must go through at least one review before merging to main. The process covers both regular code changes and emergency hotfixes with an expedited path.

# _NN Roles

* _NN Roles: Author
  ```yaml
  scope: internal
  ```
  Developer who creates the PR. Responsible for addressing feedback and ensuring CI passes before requesting review.
* _NN Roles: Reviewer
  ```yaml
  scope: internal
  ```
  Peer responsible for evaluating code quality, correctness, test coverage, and adherence to style guidelines.
* _NN Roles: Maintainer
  ```yaml
  scope: internal
  ```
  Senior engineer with merge authority. Makes the final call on approvals and handles exceptions.

# _NN Work

* _NN Work: Open Pull Request
  ```yaml
  step_type: event
  output: "Pull Request"
  tool: "GitHub"
  ```
  Author creates a PR with description, linked issue, and passing CI results.
* _NN Work: Assign Reviewer
  ```yaml
  step_type: task
  output: "Review Assignment"
  tool: "GitHub"
  ```
  Auto-assigned based on code ownership or team rotation schedule.
* _NN Work: Review Code
  ```yaml
  step_type: task
  input: "Pull Request"
  output: "Review Comments"
  tool: "GitHub"
  ```
  Reviewer checks: logic correctness, test coverage, style guidelines, security concerns.
* _NN Work: Approve or Request Changes
  ```yaml
  step_type: decision
  condition: "No blocking issues"
  next: "Merge"
  input: "Review Comments"
  ```
  If approved → proceed to merge. If changes requested → author addresses and re-requests review.
* _NN Work: Merge
  ```yaml
  step_type: event
  input: "Approved PR"
  output: "Merged PR"
  tool: "GitHub"
  ```
  Squash-merge to main. Source branch deleted automatically.

# _NN Artifacts

* _NN Artifacts: Pull Request
  GitHub PR with description, diff, discussion thread, and CI status.
* _NN Artifacts: Review Checklist
  Standardized checklist covering correctness, performance, security, and style.
* _NN Artifacts: Test Report
  Automated test and lint output attached to each PR commit.

# _NN Tools

* _NN Tools: GitHub
  PR management, code review, and merge platform.
* _NN Tools: CI Pipeline
  Automated test and lint runners triggered on every PR commit and push.

# _NN matrices: work-roles matrix

| Work \ Roles | Author | Reviewer | Maintainer |
| :--- | :---: | :---: | :---: |
| Open PR | Responsible | - | - |
| Assign Reviewer | - | - | Responsible |
| Review Code | Consulted | Responsible | Accountable |
| Approve or Request Changes | Informed | Consulted | Responsible |
| Merge | Informed | Informed | Accountable |
