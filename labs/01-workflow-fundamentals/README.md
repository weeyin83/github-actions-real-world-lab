# Lab 1: Workflow fundamentals

## Scenario

An engineering team wants every proposed change tested before merging. A
maintainer also needs to rerun the same checks manually with a chosen greeting
to confirm that inputs reach the application. You will inspect, run, modify,
break and fix the team's first workflow.

The application is intentionally tiny. Its tests are a reliable signal for
understanding automation, not an application-development project.

## Learning objectives

By the end, you can explain `name`, `on`, `jobs`, `steps`, `runs-on`, checkout,
dependency installation, environment variables, default GitHub variables,
`push`, `pull_request`, `workflow_dispatch`, and workflow inputs.

Prerequisites: complete [repository setup](../../docs/prerequisites.md) and read
[safety controls](../../docs/safety-and-costs.md). Allow approximately 45 minutes.

## Working example

Open [the active workflow](../../.github/workflows/lab-01-fundamentals.yml).
Read it from top to bottom before running it. It has one job and six ordered
steps:

1. Check out the repository.
2. Select Node.js 24.
3. Install from the lockfile.
4. Print selected non-sensitive environment information.
5. Run the tests.
6. Run the application.

Jobs can run on separate runners; steps within this job run sequentially on the
same runner and share its filesystem. Later labs introduce multiple jobs.

### YAML, property by property

| Property | Meaning in this workflow |
| --- | --- |
| `name` | Human-readable workflow label in the Actions tab. It is not a trigger. |
| `on` | Event configuration. These events are alternatives, not requirements that must all occur. |
| `push.branches: [main]` | A push to `main` starts a run; an ordinary feature-branch push does not. This branch filter does not select tag pushes. |
| `pull_request.branches: [main]` | PRs whose **base/target** branch is `main` are checked. This does not filter the source branch name. |
| `workflow_dispatch` | Allows an explicit manual run once the workflow is on the default branch. The UI lets you select a branch/ref to run. |
| `inputs.learner_name` | A string field on the manual-run form. `description` labels it, `required` requires a value, `default` supplies the suggested value, and `type` defines its input type. It is not a secret field. |
| `permissions.contents: read` | Grants the built-in token repository read access needed for checkout. Unspecified permissions are none. No publishing is permitted. |
| `env.LAB_NAME` | Workflow-level environment variable available to job steps. Environment variables are strings. |
| `jobs.test` | The job identifier, distinct from its optional display `name`. It groups runner selection and steps. |
| `runs-on: ubuntu-latest` | Chooses a GitHub-hosted Ubuntu runner. `latest` is a moving label; it does not mean the developer's local OS. |
| `timeout-minutes: 5` | Cancels this job if it exceeds five minutes. It is not a billing budget. |
| `steps` | An ordered YAML sequence; each `-` starts a step. Use spaces, not tabs, for indentation. |
| `uses` | Invokes an action at a version/reference, such as `actions/checkout@v7`. |
| `with` | Supplies inputs to that particular action. It is not an environment-variable declaration. |
| `persist-credentials: false` | Avoids leaving checkout's Git authentication available to later steps. |
| `node-version: '24'` | Selects the application's Node.js major version. Quoting keeps the value a string. |
| `package-manager-cache: false` | Explicitly disables setup-node's automatic package-manager cache; caching is not part of this introductory example. |
| `run: npm ci` | Executes a shell command on the runner. `npm ci` uses the committed lockfile and fails if it is missing or inconsistent with the manifest. |
| `run: \|` | YAML literal block scalar: the following indented lines form one multiline shell script. |
| Step `env.LEARNER_NAME` | Makes an input available to this step's process without inserting it into shell source. |
| `${{ inputs.learner_name \|\| 'engineer' }}` | GitHub evaluates the expression before the step runs. Push/PR events do not supply this manual input, so the expression supplies the fallback. |
| `run: npm test` | Runs the native Node.js test runner through the package script. A nonzero exit code fails the step and job. |
| `run: npm start` | Runs the tiny application after successful tests. Later steps normally do not run after an earlier step fails. |

Checkout is necessary: selecting a runner does **not** put your repository's
files into its workspace. setup-node selects a runtime; it does not install your
application dependencies. These are three separate responsibilities.

### Inputs and environment variables

The manual input goes into a step environment variable:

```yaml
env:
  LEARNER_NAME: ${{ inputs.learner_name || 'engineer' }}
run: npm start
```

The Node.js process reads `process.env.LEARNER_NAME`. The input is data, not a
shell command. Never embed untrusted input directly into `run` script source.
Manual input defaults do not automatically become defaults on push/PR events;
the explicit expression fallback handles those events.

The workflow's Bash scripts read `$LAB_NAME`. Locally, PowerShell uses
`$env:LAB_NAME`. `${{ ... }}` is GitHub expression syntax, not either shell's
variable syntax. Detailed contexts, scopes and outputs belong to Lab 3.

### Selected default variables

| Variable | What to observe |
| --- | --- |
| `GITHUB_EVENT_NAME` | `push`, `pull_request`, or `workflow_dispatch`. |
| `GITHUB_REPOSITORY` | Repository owner and name. |
| `GITHUB_REF` | A fully formed ref, not necessarily a branch name. An open PR run normally has `refs/pull/<number>/merge`. |
| `GITHUB_SHA` | Event-dependent commit SHA. In a normal PR run it is the test merge commit, not necessarily the feature branch tip. |
| `GITHUB_RUN_NUMBER` | A run counter for this workflow; rerunning the same run does not increment it. |
| `RUNNER_OS` | `Linux` for this Ubuntu runner. |

These variables are supplied by GitHub. They are not repository configuration
variables, and default `GITHUB_*`/`RUNNER_*` variables cannot be overwritten.
Do not print the entire environment or token-bearing contexts.

## Run the workflow

After pushing the project to `main`:

1. Open the repository's **Actions** tab.
2. Select **Lab 01 - Workflow fundamentals**.
3. Inspect the first push run. Expand each step and read its logs.
4. Click **Run workflow**, choose `main`, enter `Alex` for `learner_name`, and run.
5. Open that run. Confirm `GITHUB_EVENT_NAME` is `workflow_dispatch`, tests pass,
   and the application prints `Hello, Alex! Welcome to the GitHub Actions lab.`

If the button is absent, confirm the workflow has `workflow_dispatch` and is
committed on the repository's default branch. You need repository write access.
No secret, package permission, deployment environment or paid service is needed.

## Exercise 1: Observe push and PR triggers

1. Confirm a push to `main` starts a run.
2. Create a branch named `lab/trigger-practice` from current `main`.
3. Make a small documentation change, commit and push that branch.
4. Confirm there is **no push-triggered run for that feature-branch push** under
   the baseline filter.
5. Open a PR from this branch to `main`. A PR-triggered run should appear.
6. Push another small change to the same PR branch. A `synchronize` PR event
   starts another run even though the feature-branch `push` is filtered out.

Compare event, ref and SHA in the logs. Record the event, expected run/no-run,
observed result and explanation before continuing.

Expected: main pushes and PR open/update events run; a standalone feature push
does not. By default, `pull_request` runs on `opened`, `synchronize` and
`reopened`, not every possible PR activity.

## Exercise 2: Change triggers, then restore them

On the exercise branch, change only the `push` filter:

```yaml
push:
  branches:
    - main
    - 'lab/**'
```

Commit and push. The branch now matches, so a push run appears. If its PR remains
open, the same update can also cause a separate PR run. This is not a duplicate
execution bug: two different events matched.

Next, change the extra pattern to `'training/**'` and push again. The
`lab/trigger-practice` push no longer matches, but its open PR still runs.
Restore `push.branches: [main]` before merging the exercise.

Optional: set `pull_request.types: [opened]` temporarily. Updating an already-open
PR will no longer trigger that workflow through `synchronize`. Reopen a closed
PR and observe that `reopened` is also excluded. Remove `types` to restore the
default activity set.

Expected: changing one trigger does not disable other matching triggers.
Avoid marking this experimental workflow as a required check while filters
are being changed.

## Exercise 3: Change an input and environment variable

1. Run manually with `learner_name` set to `Release Engineer`.
2. Confirm the application greeting changes, but the test results do not:
   tests supply their own inputs rather than depending on your manual input.
3. Change `env.LAB_NAME` to `My fundamentals experiment` on your branch.
4. Push while its PR is open and verify the environment-information step shows
   the changed label. The PR event still uses the fallback learner `engineer`.

Expected: workflow configuration affects the intended process without changing
application source. Never use confidential values as inputs or environment
variables in these exercises.

## Exercise 4: Break and fix checkout

The [disabled challenge](../../challenges/01-missing-checkout.yml.disabled)
shows the intentionally broken sequence. Do not activate that file.

1. On your practice branch, temporarily remove the **Check out source** step
   from the existing active workflow.
2. Push to update an open PR targeting `main`. Do not merge the broken version.
3. Inspect **Install dependencies from the lockfile**.
4. Identify why `npm ci` cannot access the repository's lockfile. npm's exact
   error wording can vary, but the step must exit nonzero.
5. Observe that tests and the application do not run after this failure.
6. Restore checkout **before** setup-node and `npm ci`, then push again.

Expected: valid YAML can still describe a broken workflow. Restoring source
checkout fixes the underlying missing-files problem; replacing `npm ci` with
`npm install` is not the correct repair.

Optional test failure: in the greeting test, temporarily expect `Goodbye` rather
than `Hello`. Run locally, then push to the open PR. Tests fail and the application
step is skipped. Restore the assertion and verify the next run passes.

## Troubleshooting

| Symptom | Check or repair |
| --- | --- |
| No feature-branch push run | Expected under the baseline: only `main` matches `push`. Check the PR run separately. |
| PR to a different target does not run | The PR filter is for the base/target branch, not the source branch. |
| No manual-run button | Commit `workflow_dispatch` on the default branch; verify write access and Actions availability. |
| Workflow rejected before any job starts | Check YAML indentation, `.github/workflows` location, `.yml` suffix and GitHub's workflow error annotation. |
| `npm ci` fails | Check checkout ordering, working directory and lockfile. If manifest dependencies changed, regenerate and commit the lockfile with npm. |
| `node` or `npm` missing locally | Install a supported user-local Node.js distribution and reopen the terminal; the hosted setup-node step cannot configure your laptop. |
| Local tests fail after a deliberate edit | Restore the intended greeting assertion, not a success-shaped fallback or ignored error. |
| PR run has an unfamiliar SHA | PR checks normally test GitHub's synthetic merge commit. |
| Two runs after merging a PR | The PR check and resulting `main` push are separate events; compare event types and SHAs. |

## Local validation

Run from the root in PowerShell:

```powershell
npm ci
npm test
npm start
```

If the optional standalone [actionlint](https://github.com/rhysd/actionlint)
tool is already available:

```powershell
actionlint .github\workflows\lab-01-fundamentals.yml
```

It parses YAML and validates workflow structure, expression use and many common
Actions mistakes. It is a local development tool, not an application dependency
or external CI service. Do not include disabled challenges in the passing
workflow check. A generic YAML parser alone cannot validate all GitHub semantics;
older YAML 1.1 tools may also interpret unquoted `on` as a boolean key.

Local success does not prove event routing or hosted execution. The push, PR and
manual runs above are the acceptance checks for those behaviours. No hosted run
is claimed until you have pushed and observed it on GitHub.

## Expected outcome and completion checklist

- [ ] All local tests pass (four original unit tests; Lab 2 adds three integration tests).
- [ ] Workflow syntax/structure passes available validation.
- [ ] A `main` push, a PR open/update, and a manual dispatch each produce the
      expected successful hosted run.
- [ ] A nonmatching branch push does not produce a push run.
- [ ] A changed branch filter changes that result.
- [ ] The chosen manual name reaches the greeting safely.
- [ ] You can explain the event/ref/SHA differences in the logs.
- [ ] Removing checkout produces a failed install; restoring it repairs the run.
- [ ] All experimental breakage and filters are restored before merging.

Stop here for review before starting Lab 2.

## Exam knowledge

### Platform facts

- Workflows are YAML files in `.github/workflows`.
- Multiple configured events are alternatives; they are not an AND condition.
- `pull_request.branches` matches the PR's target branch.
- Manual dispatch requires the workflow on the default branch; a manual run can
  select another branch/ref. It is false that manual runs can only run `main`.
- Steps normally run in order within one job. Selecting a runner is not checkout.
- `with` supplies action inputs; `env` supplies environment variables.
- Default GitHub variables exist on the runner; they are not defined by your
  workflow-level `env` mapping.

### Common misunderstandings and outdated preparation material

- "setup-node installs package.json dependencies." False: it configures Node.js;
  `npm ci` installs the project dependencies.
- "workflow_dispatch input defaults apply to every event." False: push and PR
  events have no such manual inputs. This lab explicitly provides a fallback.
- "GITHUB_SHA is always the head commit on the author's branch." False for
  normal PR test-merge runs.
- "Only one workflow run can result from a commit." False if multiple events
  or workflows match.
- Do not memorize an old action major or old Node.js version from a question
  bank as a permanent requirement. Check maintained action releases and Node's
  support schedule. The action runtime is separate from `node-version`.

### Engineering recommendations, not platform requirements

The five-minute timeout, read-only token, non-persisted checkout credentials and
disabled caching are deliberate lab choices. GitHub does not require those
exact values for every workflow. Full-SHA action pinning is stronger than mutable
major tags; major tags are used here for introductory readability.

### Exam-style question

A workflow contains:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
```

You push a new commit to `feature/docs` while its PR targeting `main` is open.
There is no manual dispatch. Which event starts a run?

**A.** `push`, because the source branch has a PR targeting `main`.

**B.** `pull_request` with activity `synchronize`, because the PR targets `main`.

**C.** Both events always run whenever a PR branch is updated.

**D.** Neither event; only pushes directly to `main` can run this workflow.

**Correct answer: B.**

- **A is incorrect:** the push filter checks the branch being pushed, which is
  `feature/docs`, not `main`.
- **B is correct:** updating an open PR produces `synchronize`, included in the
  default PR activities; the PR's target matches `main`.
- **C is incorrect:** events are evaluated independently. The push does not
  match here, though Exercise 2 shows how both could match.
- **D is incorrect:** the separately configured PR trigger also applies.

## Official references

- [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Manual workflow execution](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [Default environment variables](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)
- [GitHub-hosted runners](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners)
- [Checkout action](https://github.com/actions/checkout)
- [Setup Node.js action](https://github.com/actions/setup-node)
