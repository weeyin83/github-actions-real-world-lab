# Lab 2: Matrix strategies and job dependencies

## Scenario

Your team supports two Node.js LTS versions. Unit tests check the greeting
function; integration tests start the real CLI and check its environment,
output and exit status. Before a future build can start, **every** supported
version and test suite must pass.

You will expand one job definition into four isolated jobs, control their
parallelism, introduce a failure and observe downstream dependency behaviour.
There is no actual build or deployment yet.

## Learning objectives

- Define multiple dimensions with `strategy.matrix`.
- Understand parallel jobs, `max-parallel` and `fail-fast`.
- Gate downstream jobs with `needs`.
- Use conditions to distinguish success-only work from failure reporting.
- Diagnose missing dependencies and matrix cancellation.

Complete [Lab 1](../01-workflow-fundamentals/README.md) first. Allow about
45 minutes. This workflow is **manual-only**, so ordinary commits and PRs do
not start four matrix jobs.

## Working example

Open [the workflow](../../.github/workflows/lab-02-matrix.yml). The matrix is:

```yaml
strategy:
  fail-fast: ${{ inputs.fail_fast }}
  max-parallel: 2
  matrix:
    node: ['22', '24']
    suite: [unit, integration]
```

The Cartesian product creates **2 x 2 = 4** jobs:

| Node.js | Suite | Command | Tests |
| --- | --- | --- | --- |
| 22 | unit | `npm run test:unit` | 4 function tests |
| 22 | integration | `npm run test:integration` | 3 CLI process tests |
| 24 | unit | `npm run test:unit` | 4 function tests |
| 24 | integration | `npm run test:integration` | 3 CLI process tests |

These are not four steps sharing one machine. Each matrix combination is a
separate job with its own runner and checkout. `max-parallel: 2` permits at most
two combinations at once; runner availability or account limits may permit fewer.
Do not rely on an exact job start/completion order.

After the matrix, the job graph fans into two separate downstream jobs:

```text
test (22 / unit) -----------+
test (22 / integration) ---+--> ready  (only if all tests succeeded)
test (24 / unit) -----------+--> report (also after failures, unless cancelled)
test (24 / integration) ---+
```

`ready` and `report` both depend directly on `test`, not on each other. When
eligible, they may run in parallel. There are four matrix jobs and up to two
downstream jobs in a run. Their runners do not inherit files from test runners;
file transfer is covered in Lab 4.

### YAML, property by property

| Property | Meaning |
| --- | --- |
| `workflow_dispatch` | Runs only after an explicit manual request; there are no push/PR triggers in this lab. |
| `inputs.fail_fast` | Boolean manual input, default `false`, allowing all combinations to finish for diagnosis. |
| `inputs.inject_failure` | Boolean input, default `false`, that deliberately fails exactly one combination. |
| `permissions.contents: read` | Checkout can read the repository; no package publishing permission. |
| `jobs.test` | A single job definition expanded by the matrix. `test` is the dependency ID for the entire matrix. |
| Job `name` | Uses matrix expressions so the graph identifies each Node.js/suite combination. |
| `strategy` | Holds matrix expansion and scheduling/failure controls for this job definition. |
| `matrix.node` / `matrix.suite` | The current combination's values, not all values at once. |
| `node: ['22', '24']` | Two supported LTS major versions. They are quoted strings to match the injection condition and setup-node input. |
| `suite: [unit, integration]` | A second independent dimension; not a list of sequential steps. |
| `max-parallel: 2` | Limits simultaneously running jobs within this matrix. It does not reduce the total to two or impose a workflow/account-wide limit. |
| `fail-fast` | Cancels queued/in-progress jobs in this matrix when a non-tolerated matrix job fails. Defaults to `true` if omitted; here it is explicitly controlled by a boolean input. |
| Step `if` | Runs the deliberate-failure step only when injection is enabled and both matrix values match Node.js 22 / unit. |
| `exit 1` | Makes the failure explicit. This is a controlled orchestration experiment, not a bug in the app. |
| `node-version: ${{ matrix.node }}` | Configures the application runtime separately in each job. |
| Step `env.TEST_SUITE` | Passes the current suite to Bash as data. |
| `npm run "test:$TEST_SUITE"` | Selects an existing script from the package manifest: `test:unit` or `test:integration`. |
| `needs: test` | Waits for the matrix job group, not just the first successful combination. Job order in the YAML is not a dependency. |
| `ready.if` | Explicitly requires the dependency result to be `success`. Normal dependent jobs are already success-gated; the condition makes the lesson visible. |
| `report.if: ${{ always() && !cancelled() }}` | Overrides normal success-only scheduling for reporting after failures, but avoids running this report after workflow cancellation. |
| `needs.test.result` | The dependency's aggregate result, not a per-cell result table. Possible job results include `success`, `failure`, `cancelled` and `skipped`. |
| `timeout-minutes: 5` | Limits each individual job, not the combined run or an account budget. |

`if` expressions on jobs and steps are not interchangeable. In particular,
GitHub evaluates a **job-level** `jobs.<id>.if` before applying that job's
matrix expansion. Do not try to move this per-combination failure condition
into the matrix job's top-level `if`.

### Failure and dependency semantics

- With `fail-fast: false`, a failing cell does not cancel the other cells.
  The overall workflow still fails. This setting does **not** tolerate failures.
- With `fail-fast: true`, unfinished sibling matrix jobs may be cancelled.
  Already-completed jobs stay completed. Fast jobs and runner timing mean
  cancellation counts are not deterministic.
- `fail-fast` applies to this matrix, not every unrelated job in the workflow.
- A normal job needing a failed or skipped job is skipped; that can propagate
  through a dependency chain. A status-check condition such as `always()` can
  override normal success-only scheduling.
- `always()` is not a recommendation to deploy after failure. This lab uses
  it only for a tiny result report and adds `!cancelled()`.
- A successful report cannot turn failed matrix jobs into a successful workflow.
- `continue-on-error` is a different mechanism: it tolerates selected failures.
  This lab intentionally does not use it.

## Run locally

From the project root in PowerShell:

```powershell
npm ci
npm run test:unit
npm run test:integration
npm test
```

Expected: 4 unit tests, 3 integration tests, and 7 tests under `npm test`.
The original unit tests are unchanged. Integration tests use Node's built-in
child-process API with no shell and clear any inherited learner-name override,
so your terminal environment cannot accidentally change the default-name case.
No new package dependency is needed.

Local tests run on your installed Node.js version. A single local run does not
prove the hosted two-version matrix, scheduling or event behaviour.

## Exercise 1: Observe expansion and parallelism

1. Make sure the workflow is on the default branch.
2. Open **Actions -> Lab 02 - Matrix strategies and dependencies**.
3. Click **Run workflow**, choose `main`, and leave both checkboxes **false**.
4. Inspect the graph and each job's setup-node and test logs.
5. Confirm there are four matrix combinations, never more than two running
   simultaneously, followed by the readiness gate and result report.

Expected: all six jobs succeed. Unit cells run four tests each; integration cells
run three each. Across the two Node.js versions that is fourteen test executions,
not fourteen distinct tests.

Record a table with combination, result, tests run and whether it overlapped
another cell. A queued job is not evidence that the matrix is broken.

## Exercise 2: Deliberate failure without fail-fast

Run again with:

- `inject_failure`: **true**
- `fail_fast`: **false**

Expected:

- Node.js 22 / unit fails in **Optional deliberate matrix failure**, before
  checkout or dependency installation, keeping this experiment short.
- Its later steps are skipped; the remaining three combinations run normally.
- `ready` is skipped because not every matrix combination passed.
- `report` runs, prints the dependency result and does not hide the failure.
- The workflow conclusion is failure.

No source edits are necessary. The next normal run is repaired by setting
`inject_failure` back to false. No injected failure can occur on a push or PR
because this workflow has no such triggers.

## Exercise 3: Compare fail-fast

Repeat with **both inputs true**. Compare the graph with Exercise 2.

Expected: Node.js 22 / unit fails, and any still queued/running matrix siblings
are eligible for cancellation. Some may already have completed. Read their
timestamps and conclusions rather than expecting an exact number cancelled.
The readiness gate does not run; a failed test job still fails the workflow.

For a real test defect instead of an injected orchestration failure, temporarily
change the expected greeting in one unit assertion on a practice branch. Dispatch
that branch with injection false and fail-fast false. Both unit cells should fail,
while both integration cells should pass. Restore the assertion before merging.
The existing Lab 1 PR workflow will also detect the modified assertion.

## Exercise 4: Change the concurrency cap

On a practice branch, change `max-parallel` to `1`, commit and push. Dispatch
that branch with both failure inputs false. Matrix jobs are now serialized
even when more runners are available.

Expected: still four combinations, but only one matrix cell running at a time.
`ready` and `report` may still overlap after the matrix: this cap does not apply
to them. Restore `max-parallel: 2` before merging.

Optional: predict the number of cells before adding supported Node.js `'26'`.
Three versions x two suites produces six cells, not five. Restore the baseline
matrix after observing it; do not broaden routine runs unnecessarily.

## Exercise 5: Break and fix a dependency

Inspect [the disabled missing-needs challenge](../../challenges/02-missing-needs.yml.disabled).
Its YAML is valid, but the readiness job is not gated by tests.

Safely reproduce the defect on a practice branch in the **existing Lab 2
workflow**, rather than activating another workflow:

1. Temporarily remove both `needs: test` and the `if` condition from `ready`.
   Removing both avoids referencing a dependency that no longer exists.
2. Dispatch that branch with injection true and fail-fast false.
3. Observe that `ready` no longer waits for the matrix and can print readiness
   even though a test job fails.
4. Restore `needs: test` and its success condition, then repeat.

Expected after repair: `ready` is skipped for a failed matrix and runs only
after a fully successful one. Its location below `test` in YAML never guaranteed
an execution order. This fixture is harmless because readiness only prints text;
the same missing dependency would be dangerous in a real publishing pipeline.

## Troubleshooting

| Symptom | Explanation or repair |
| --- | --- |
| Only two matrix jobs run at once | Expected: `max-parallel: 2`. There are still four combinations. |
| Fewer than two run at once | Runner availability and account limits can further restrict concurrency. |
| More cancelled jobs than expected | Check `fail_fast` and timestamps. Cancellation is timing-dependent. |
| No cancelled siblings despite fail-fast | Siblings may have finished already. Fail-fast is not retroactive. |
| Matrix failed but readiness did not start | Correct behaviour: `needs` and the success condition gate it. |
| Report skipped after manual cancellation | Intentional: `!cancelled()` excludes workflow cancellation. |
| Report succeeded but workflow failed | Correct: reporting does not tolerate or replace failed tests. |
| `npm` says a test script does not exist | Keep matrix suite names aligned with `test:unit` / `test:integration` in the manifest. |
| A job-level matrix condition is rejected | Job `if` is evaluated before matrix expansion; use an appropriate step condition for this exercise. |
| Workflow did not start on a push | Intentional: Lab 2 is manual-only; Lab 1 still handles ordinary push/PR testing. |

## Validation and expected outcome

If the optional standalone actionlint tool is available:

```powershell
actionlint .github\workflows\lab-01-fundamentals.yml .github\workflows\lab-02-matrix.yml
```

Valid YAML alone cannot detect missing `needs` as a business-logic defect.
Inspect the graph and observed job conclusions as well as running a linter.

- [ ] Both suite commands and the complete seven-test suite pass locally.
- [ ] A normal hosted run has four passing matrix cells and two passing dependants.
- [ ] Injection without fail-fast fails one cell while three others finish.
- [ ] Failed matrix testing skips readiness but still permits the result report.
- [ ] A fail-fast run demonstrates cancellation eligibility without assuming order.
- [ ] Changing the concurrency cap changes overlap, not matrix size.
- [ ] You reproduce and repair the missing dependency.
- [ ] Restore both input defaults, the matrix, concurrency cap and dependency.

Stop for review before Lab 3; no artefact handling, outputs, publishing or
deployment has been added here.

## Exam knowledge

### How GitHub Actions actually works

- Independent matrix dimensions form a Cartesian product.
- Matrix cells are jobs, not sequential steps within one job.
- `needs` is an explicit dependency edge; YAML ordering is not.
- `needs: test` waits for the expanded matrix, not any one passing cell.
- `max-parallel` is a matrix concurrency ceiling, not a total-job limit.
- `fail-fast` defaults to true; false keeps other cells running after a failure.
- Boolean `workflow_dispatch` inputs remain booleans in the `inputs` context.
  String `'false'` is not a substitute for boolean false in expression reasoning.

### Misunderstandings and outdated preparation material

- "fail-fast false makes a failed matrix pass." Incorrect; it does not mean
  `continue-on-error`.
- "max-parallel 2 runs only two combinations." Incorrect; it limits overlap.
- "All jobs below a failed job are skipped." Incorrect; dependencies and
  conditions govern execution, not visual ordering.
- "always means this job must always execute under all circumstances." Too
  broad: workflow cancellation, other conditions and scheduling still matter.
- "The last matrix result is the only one that matters." Incorrect; a passing
  cell does not erase another cell's non-tolerated failure.
- Do not memorize unsupported Node.js versions from a sample matrix in an
  old question bank. Version selection is an engineering decision governed by
  the workload's support policy.

### Engineering recommendations

Use a small matrix covering meaningful compatibility boundaries. Start with
fail-fast false when investigating failures; use fail-fast true when early
failure should conserve runner work. Keep reports separate from success gates
and never attach unconditional publishing to `always()`.

### Exam-style question

A workflow has two Node.js versions and two suites in its matrix,
`max-parallel: 2`, and `fail-fast: false`. A downstream `build` job declares
`needs: test` with no condition overriding normal success-only behaviour.
One matrix cell fails and the other three pass. What happens?

**A.** Only two matrix jobs exist; `build` starts after the first succeeds.

**B.** Four matrix jobs exist; the failure does not cancel the other cells,
and `build` is skipped.

**C.** Four matrix jobs exist; `fail-fast: false` tolerates the failure, so
`build` succeeds.

**D.** Four matrix jobs exist; the failure immediately cancels all remaining
jobs regardless of the strategy.

**Correct answer: B.**

- **A is incorrect:** the matrix has four combinations; the concurrency cap
  does not change its size, and `needs` waits for the group.
- **B is correct:** false disables sibling cancellation, not failure reporting.
  A normal dependent job requires successful prerequisites.
- **C is incorrect:** tolerating a job failure is a different concern from
  fail-fast; this workflow does not use `continue-on-error`.
- **D is incorrect:** it contradicts `fail-fast: false`; even with true, already
  completed jobs remain completed and unrelated jobs are not its scope.

## Official references

- [Running variations of jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations)
- [Matrix syntax, fail-fast and max-parallel](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstrategy)
- [Job dependencies with needs](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds)
- [Status-check functions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#status-check-functions)
- [Needs context](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#needs-context)
- [Node.js support schedule](https://nodejs.org/en/about/previous-releases)
