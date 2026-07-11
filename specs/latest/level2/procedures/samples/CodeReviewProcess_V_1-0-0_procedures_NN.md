---
specification_version: "V_0-2-0"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/v0.2.0/level1/iNNfo_V_0-2-0_NN.md"
level: 3
parent_spec:
  name: "procedures_V_0-2-0"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/main/specs/v0.2.0/level2/procedures/procedures_V_0-2-0_NN.md"
model_version: "V_1-0-0"
title: "Code Review Process"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file that carries its own schema in the YAML frontmatter. The template definition is resolved via the parent chain and cached in the `specs/` directory.

# _NN index

* [[Work]]
* [[Roles]]
* [[Artifact]]
* [[Tools]]

# _NN Work

* _NN Work: Standard Code Review Process
  next: "Emergency Hotfix Process"
  Standard code review procedure for the engineering team at Acme Corp. Every pull request must go through at least one review before merging to main. The process covers the full lifecycle from opening a PR to cleaning up the source branch after merge.

* _NN Work: Open Pull Request
  ```yaml
  parent: "Standard Code Review Process"
  step_type: event
  next: "Assign Reviewer"
  output: "Pull Request"
  tool: "GitHub"
  ```
  Author creates a PR with a descriptive title, linked issue or ticket, and a summary of changes. CI must pass before the PR is eligible for review.

* _NN Work: Assign Reviewer
  ```yaml
  parent: "Standard Code Review Process"
  step_type: task
  next: "Review Code Changes"
  output: "Review Assignment"
  tool: "GitHub"
  ```
  A reviewer is auto-assigned based on code ownership, team rotation, or expertise area. The author can also request specific reviewers if the change touches a sensitive module.

* _NN Work: Review Code Changes
  ```yaml
  parent: "Standard Code Review Process"
  step_type: task
  next: "Approve or Request Changes"
  input: "Pull Request"
  output: "Review Comments"
  tool: "GitHub"
  ```
  Reviewer checks: logic correctness, test coverage, style guidelines, security concerns, and performance implications. Each finding is documented as a review comment inline on the diff.

* _NN Work: Approve or Request Changes
  ```yaml
  parent: "Standard Code Review Process"
  step_type: decision
  condition: "No blocking issues"
  next: "Merge to Main"
  input: "Review Comments"
  ```
  If no blocking issues remain, the reviewer approves. If changes are needed, the author addresses each comment and re-requests review. This cycle repeats until approval.

* _NN Work: Merge to Main
  ```yaml
  parent: "Standard Code Review Process"
  step_type: event
  next: "Close Source Branch"
  input: "Approved PR"
  output: "Merged PR"
  tool: "GitHub"
  ```
  Squash-merge the approved PR into main. The merge commit includes the PR number and a summary of changes. CI runs again on main to verify the integration.

* _NN Work: Close Source Branch
  ```yaml
  parent: "Standard Code Review Process"
  step_type: task
  input: "Merged PR"
  output: "Branch Closure"
  tool: "GitHub"
  ```
  The source branch is deleted automatically after merge. The author verifies that no dangling references or open PRs remain on that branch.

* _NN Work: Emergency Hotfix Process
  next: "Release Review Process"
  Expedited process for critical production bugs. Bypasses the standard review queue when a P0 incident is active and a maintainer authorises the fast track. The hotfix still requires at least one pair of eyes before deployment.

* _NN Work: Create Hotfix Branch
  ```yaml
  parent: "Emergency Hotfix Process"
  step_type: task
  next: "Request Expedited Review"
  output: "Hotfix Branch"
  tool: "GitHub"
  ```
  Branch from main with a `hotfix/` prefix. Keep changes minimal — one commit per fix. Attach the incident ticket to the PR description and tag the on-call engineer.

* _NN Work: Request Expedited Review
  ```yaml
  parent: "Emergency Hotfix Process"
  step_type: task
  next: "Bypass Standard Review"
  input: "Hotfix Branch"
  output: "Incident Report"
  ```
  The author requests an expedited review through the incident channel, notifying the on-call engineer and the maintainer. The standard review queue is bypassed, but at least one reviewer must acknowledge the request.

* _NN Work: Bypass Standard Review
  ```yaml
  parent: "Emergency Hotfix Process"
  step_type: decision
  condition: "P0 incident + maintainer authorisation"
  next: "Deploy to Production"
  input: "Hotfix Branch"
  ```
  If the incident is P0 and a maintainer has authorised the fast track, the hotfix skips the standard review queue. The on-call engineer reviews the diff directly and gives a go/no-go.

* _NN Work: Deploy to Production
  ```yaml
  parent: "Emergency Hotfix Process"
  step_type: event
  next: "Monitor Post-Deploy"
  input: "Approved Hotfix"
  output: "Deployment Report"
  tool: "CI Pipeline"
  ```
  Deploy immediately via the CI pipeline. The deployment is tagged with the incident ID for traceability. If the pipeline fails, roll back and escalate.

* _NN Work: Monitor Post-Deploy
  ```yaml
  parent: "Emergency Hotfix Process"
  step_type: task
  next: "Escalate if Unresolved"
  input: "Deployment Report"
  tool: "Monitoring Dashboard"
  ```
  Watch production dashboards for 15 minutes after deployment. Check error rates, latency, and key business metrics. Log any anomalies in the incident thread.

* _NN Work: Escalate if Unresolved
  ```yaml
  parent: "Emergency Hotfix Process"
  step_type: decision
  condition: "Incident resolved within 30 minutes"
  input: "Deployment Report"
  ```
  If the incident is not resolved within 30 minutes of the deploy, escalate to the engineering manager and page the full on-call rotation. A rollback may be triggered if the fix introduces new issues.

* _NN Work: Release Review Process
  Pre-release review and sign-off cycle for scheduled releases. Combines regression testing, security scanning, release notes, and stakeholder approval before deploying to production. Runs on a Release branch cut from main after the feature freeze.

* _NN Work: Create Release Branch
  ```yaml
  parent: "Release Review Process"
  step_type: task
  next: "Run Regression Suite"
  output: "Release Branch"
  tool: "GitHub"
  ```
  Cut a `release/` branch from main at the feature freeze point. Only bug fixes and release-related changes are allowed on this branch. The release manager owns the branch lifecycle.

* _NN Work: Run Regression Suite
  ```yaml
  parent: "Release Review Process"
  step_type: event
  next: "Perform Security Scan"
  output: "Test Report"
  tool: "CI Pipeline"
  ```
  Execute the full regression test suite: unit, integration, and end-to-end tests. All tests must pass with zero failures. Flaky tests are quarantined and must be fixed before the next release.

* _NN Work: Perform Security Scan
  ```yaml
  parent: "Release Review Process"
  step_type: task
  next: "Draft Release Notes"
  output: "Security Scan Report"
  tool: "Security Scanner"
  ```
  Run dependency vulnerability scan, SAST, and secrets detection on the release branch. Any critical or high-severity finding must be resolved or explicitly waived by the security auditor before sign-off.

* _NN Work: Draft Release Notes
  ```yaml
  parent: "Release Review Process"
  step_type: task
  next: "Get Sign-Off"
  output: "Release Notes"
  tool: "GitHub"
  ```
  Aggregate all PRs merged since the last release tag. Categorise by type: feature, bugfix, improvement, dependency update. Include migration notes, breaking changes, and credits to external contributors.

* _NN Work: Get Sign-Off
  ```yaml
  parent: "Release Review Process"
  step_type: decision
  condition: "All checks pass + release manager approval"
  next: "Tag & Deploy Release"
  input: "Release Notes"
  ```
  The release manager reviews the test report, security scan, and release notes. If everything is green, they sign off. If any blocker exists, the release is postponed and the issue is assigned to the responsible team.

* _NN Work: Tag & Deploy Release
  ```yaml
  parent: "Release Review Process"
  step_type: event
  input: "Signed-Off Release"
  output: "Deployment Report"
  tool: "CI Pipeline"
  ```
  Tag the release commit with a semantic version tag (e.g. `v2.3.1`), push the tag, and deploy to production via the CI pipeline. The deployment report is posted to the team channel.

# _NN Roles

* _NN Roles: Author
  ```yaml
  scope: internal
  ```
  Developer who creates the PR. Responsible for writing quality code, addressing review feedback, and ensuring CI passes before requesting review. Participates in all three review tracks.

* _NN Roles: Reviewer
  ```yaml
  scope: internal
  ```
  Peer responsible for evaluating code quality, correctness, test coverage, and adherence to style guidelines. Provides constructive feedback and approves or requests changes.

* _NN Roles: Maintainer
  ```yaml
  scope: internal
  ```
  Senior engineer with merge authority. Makes the final call on approvals, handles exceptions, and authorises the hotfix fast track. Accountable for the overall health of the codebase.

* _NN Roles: On-Call Engineer
  ```yaml
  scope: internal
  ```
  Engineer on duty when a P0 incident fires. Authorises the hotfix fast track, monitors the deployment, and escalates if the incident is not resolved in time.

* _NN Roles: Release Manager
  ```yaml
  scope: internal
  ```
  Owns the release lifecycle: coordinates the feature freeze, manages the release branch, reviews sign-off criteria, and triggers the production deploy. Acts as the gatekeeper for scheduled releases.

* _NN Roles: Security Auditor
  ```yaml
  scope: internal
  ```
  Reviews security scan results, waives low-risk findings, and blocks releases with unresolved critical vulnerabilities. Ensures the release meets the organisation's security baseline.

# _NN Artifact

* _NN Artifact: Pull Request
  GitHub PR with description, diff, discussion thread, and CI status.
* _NN Artifact: Review Checklist
  Standardised checklist covering correctness, performance, security, and style.
* _NN Artifact: Review Comments
  Inline feedback on the PR diff, organised by file and line number.
* _NN Artifact: Review Assignment
  Notification and tracking record of the reviewer assigned to a PR.
* _NN Artifact: Test Report
  Automated test and lint output attached to each PR commit or release branch.
* _NN Artifact: Hotfix Branch
  Git branch with `hotfix/` prefix containing the minimal fix for a P0 incident.
* _NN Artifact: Incident Report
  Documentation of the P0 incident: impact, root cause, fix applied, and post-mortem reference.
* _NN Artifact: Deployment Report
  Output from the CI/CD pipeline confirming the deployment and listing the commits shipped.
* _NN Artifact: Release Branch
  Git branch with `release/` prefix cut at feature freeze, used for pre-release validation.
* _NN Artifact: Security Scan Report
  Output from SAST, dependency scan, and secrets detection, categorised by severity.
* _NN Artifact: Release Notes
  Changelog for the release, categorising changes by type and noting breaking changes.
* _NN Artifact: Branch Closure
  Confirmation that the source branch has been deleted and no dangling references remain.

# _NN Tools

* _NN Tools: GitHub
  PR management, code review, and merge platform. Used for branching, reviewing, and releasing.
* _NN Tools: CI Pipeline
  Automated test, lint, and deployment runners triggered on every PR commit, push, and release tag.
* _NN Tools: Monitoring Dashboard
  Production observability dashboard (APM, error rates, latency) used to verify hotfix deployments.
* _NN Tools: Security Scanner
  SAST, dependency vulnerability scan, and secrets detection tool (e.g. Snyk, SonarQube, or Semgrep).
* _NN Tools: Incident Tracker
  Incident management platform (e.g. PagerDuty, Opsgenie) used to page on-call engineers and track P0 events.

# _NN matrices: work-roles matrix

| Work \ Roles | Author | Reviewer | Maintainer | On-Call Engineer | Release Manager | Security Auditor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Open PR | Responsible | - | - | - | - | - |
| Assign Reviewer | - | - | Responsible | - | - | - |
| Review Code Changes | Consulted | Responsible | Accountable | - | - | - |
| Approve or Request Changes | Informed | Consulted | Responsible | - | - | - |
| Merge to Main | Informed | Informed | Accountable | - | - | - |
| Close Source Branch | Responsible | - | - | - | - | - |
| Create Hotfix Branch | Responsible | - | - | Consulted | - | - |
| Request Expedited Review | Responsible | - | - | Accountable | - | - |
| Bypass Standard Review | Responsible | - | Accountable | Consulted | - | - |
| Deploy to Production | Consulted | - | Accountable | Responsible | - | - |
| Monitor Post-Deploy | - | - | Informed | Responsible | - | - |
| Escalate if Unresolved | - | - | Accountable | Responsible | - | - |
| Create Release Branch | - | - | - | - | Responsible | - |
| Run Regression Suite | - | - | - | - | Accountable | Consulted |
| Perform Security Scan | - | - | - | - | Accountable | Responsible |
| Draft Release Notes | Responsible | - | - | - | Consulted | - |
| Get Sign-Off | Informed | - | - | - | Accountable | Consulted |
| Tag & Deploy Release | - | - | Informed | - | Responsible | - |
