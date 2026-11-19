# Lab 3: Environment variables and outputs

## Scenario

Your team needs a traceable build version for later packaging. One job generates
it from the package version and GitHub run metadata. A later job must receive
the exact same value, rather than inventing a version independently.

You will also separate three different things often called "variables":
process environment variables, repository configuration variables, and explicit
workflow outputs. No package is built or published in this lab.

## Learning objectives

- Compare workflow-, job- and step-level `env` scope.
- Read the `env`, `vars` and `github` contexts.
- Write `$GITHUB_ENV` and `$GITHUB_OUTPUT` correctly.
- Read step outputs and promote them to job outputs.
- Pass a version between jobs using `needs`.
- Diagnose why a local environment variable is not a cross-job output.

Complete [Lab 2](../02-matrix-strategies/README.md) first. Allow about 45 minutes.
The [working workflow](../../.github/workflows/lab-03-variables-and-outputs.yml)
is manual-only, with two jobs and a five-minute timeout per job.

## Working example

```text
prepare
  workflow env -> job override -> temporary step override
  generate version
    -> GITHUB_ENV    -> later steps in prepare
    -> GITHUB_OUTPUT -> step output -> job output
                                           |
                                     needs: prepare
                                           |
consume <------------------------ needs.prepare.outputs.build_version
```

The app stays unchanged. `prepare` checks out its package manifest and configures
Node.js 24 to read the package version. `consume` only validates a string using
Bash, so it needs neither checkout nor dependency installation. Output transfer
does not transfer files or a Node.js installation.

### Environment variables versus outputs

| Mechanism | Purpose | Scope/access |
| --- | --- | --- |
| Workflow `env` | Shared starting environment configuration | Steps across jobs, unless overridden |
| Job `env` | Configuration for one job | That job's steps, unless overridden |
| Step `env` | Configuration for one step | That step's process only |
| Shell variable, such as `version=...` | Temporary shell computation | Current shell; not automatically a later step's variable |
| `$GITHUB_ENV` | Add/change a runner environment variable for subsequent steps | Later steps in the same job, not the current step or another job |
| `$GITHUB_OUTPUT` | Declare a named result of a step | `steps.<step_id>.outputs.<name>` in later steps of that job |
| Job `outputs` mapping | Publish selected results to dependent jobs | `needs.<job_id>.outputs.<name>` in jobs declaring the dependency |
| `vars` context | Non-sensitive configuration stored in GitHub settings | Available configuration variables; not automatically shell environment variables |
| `github` context | Metadata about the event, repository and workflow run | Available properties depend on context and evaluation location |

Outputs are strings, not environment variables. To use one as `$RECEIVED_VERSION`
in Bash, explicitly map the output into `env`.

Workflow-level `env` is applied separately to each job. That does **not** make a
runtime update via `$GITHUB_ENV` global to the workflow.

### YAML and shell, property by property

| Property or expression | What it does here |
| --- | --- |
| `workflow_dispatch.inputs.omit_output` | Boolean troubleshooting switch; defaults to false. It never runs automatically on a push or PR. |
| Workflow `env.LAB_NAME` | Supplies a label to both jobs. |
| Workflow `env.SCOPE_DEMO: workflow` | Establishes the least-specific value for this demonstration. |
| `prepare.env.SCOPE_DEMO: job` | Overrides the workflow value in the producer job. |
| Step `env.SCOPE_DEMO: step` | Overrides the job value for this step only; the next step sees `job` again. |
| `${{ env.SCOPE_DEMO }}` | Reads the applicable environment context at that workflow location; here it is mapped into `CONTEXT_SCOPE` for comparison with the shell value. |
| `${{ vars.LAB_BUILD_CHANNEL \|\| 'practice' }}` | Reads an optional repository variable, with a documented default when it is absent or empty. It is only a displayed label, not a deployment target. |
| `${{ github.actor }}` / `${{ github.repository }}` | Selects non-sensitive metadata without dumping the entire context. |
| `id: version` | Gives the generating step a stable identifier used by the output references. Its display `name` is not its ID. |
| `node -p "require('./package.json').version"` | Reads the app's package version, currently `0.1.0`. |
| `GITHUB_RUN_NUMBER` | A workflow-specific run number. It is not a globally unique release number. |
| `GITHUB_RUN_ATTEMPT` | Starts at 1 and increases when the same workflow run is rerun. |
| `${GITHUB_SHA:0:7}` | Bash substring syntax selecting the first seven commit characters; it is not GitHub expression syntax. |
| `>> "$GITHUB_ENV"` | Appends a `NAME=value` line to the environment-command file. The runner applies it after the step finishes. |
| `>> "$GITHUB_OUTPUT"` | Appends a named step output. It does not create an environment variable with that name. |
| `${{ steps.version.outputs.build_version }}` | Reads the producing step's output within `prepare`. |
| `prepare.outputs.build_version` | Exposes that step output as a named job output. |
| `consume.needs: prepare` | Establishes both execution ordering and access to the producer's job outputs. |
| `${{ needs.prepare.outputs.build_version }}` | Reads the explicitly exported job output in the consumer. |
| Consumer `env.RECEIVED_VERSION` | Makes the transferred string available to Bash. |
| `${BUILD_VERSION-...}` | Bash fallback used to display that the variable is not set in the writing step; it is not an output default. |
| `${BUILD_VERSION:?...}` | Explicitly fails if the later producer step cannot see the expected environment value. |
| Consumer checks and `exit 1` | Reject missing or malformed outputs rather than silently inventing a successful result. |

The most-specific applicable `env` value wins: **step > job > workflow**.
The workflow deliberately reads `${{ env.SCOPE_DEMO }}` in steps without a
same-step `SCOPE_DEMO` assignment; do not treat an `env` mapping as an ordered
script where one sibling entry can initialize another.

Contexts are evaluated at supported workflow locations, while `$NAME` is
expanded by the runner's shell. Do not assume a runner-created value is available
in every workflow expression or scheduling field. Default `GITHUB_*` variables
are not workflow-defined entries in `env`; use the relevant `github` property
when a context is needed.

### The version contract

Example:

```text
0.1.0-lab.12.1+abcdef0
  |       | |     |
package   | |     seven-character commit prefix
          | run attempt
          workflow run number
```

This is a SemVer-shaped educational build version: `lab.12.1` is prerelease
information and `abcdef0` is build metadata. It is traceable within this
workflow, not a globally unique identifier across repositories or workflows.
The consumer validates three numeric package-version components, numeric run
and attempt components, and a seven-character lowercase hexadecimal suffix.

The run number is unchanged on rerun; the attempt changes, so the version changes
even when the commit does not. This string is **not a Docker image tag**: Docker
tags cannot contain `+`. Lab 6 will explain appropriate image tags separately.

### The complete output chain

```yaml
jobs:
  prepare:
    runs-on: ubuntu-latest
    outputs:
      build_version: ${{ steps.version.outputs.build_version }}
    steps:
      - id: version
        run: printf 'build_version=0.1.0-lab.1.1+abcdef0\n' >> "$GITHUB_OUTPUT"

  consume:
    needs: prepare
    runs-on: ubuntu-latest
    steps:
      - env:
          RECEIVED_VERSION: ${{ needs.prepare.outputs.build_version }}
        run: printf 'Received: %s\n' "$RECEIVED_VERSION"
```

This simplified reference uses a literal version; the active workflow generates
the real value. The step output name and exported job output name happen to
match, but they are separate names connected by the mapping.

## Exercise 1: Observe scope and version transfer

1. Open **Actions -> Lab 03 - Variables and outputs -> Run workflow**.
2. Select `main`, leave `omit_output` unchecked, and run.
3. In `prepare`, inspect the job-scope and step-scope logs.
4. Compare the local shell version, later-step environment version, later-step
   output version, and consumer's verified version.

Expected:

| Location | Value |
| --- | --- |
| Producer shell / env-context scope | `job` |
| Step with the override | `step` |
| Producer after that step | `job` |
| Consumer shell / env-context scope | `workflow` |
| `BUILD_VERSION` in its writing step | Not yet available |
| `BUILD_VERSION` in the later producer step | Generated version |
| `BUILD_VERSION` in the consumer | Not inherited |
| Consumer `RECEIVED_VERSION` | Exactly the producer's output |

Both jobs must pass. Record the version and corresponding run URL. The producer
and consumer must agree character-for-character.

## Exercise 2: Inspect vars without using a secret

The workflow works without any configuration variable and displays `practice`.
An unset `vars` property evaluates to an empty string, so the expression's
fallback is intentional, not evidence that a repository setting was created.

Optionally, if your personal repository allows managing variables:

1. Open **Settings -> Secrets and variables -> Actions -> Variables**.
2. Create a **repository variable**, not a secret, named `LAB_BUILD_CHANNEL`.
3. Use the non-sensitive value `training` and run the workflow again.
4. Confirm the label changes to `training`, but the version format does not.
5. Delete only the variable you created when finished, or leave it intentionally
   documented for later experiments.

No credential is needed. Skip the settings exercise if you lack access; the
default path teaches the same workflow. Never change organisation settings.
Configuration variables are not automatically exported to processes: this
workflow explicitly maps `vars.LAB_BUILD_CHANNEL` into `env.BUILD_CHANNEL`.

## Exercise 3: Break the output while keeping the environment

Run with `omit_output` **true**.

Expected:

- The producer still writes `BUILD_VERSION` to `$GITHUB_ENV`.
- Its later step sees that environment variable, proving generation succeeded.
- The step output is empty because `$GITHUB_OUTPUT` was deliberately not written.
- The exported job output is therefore empty.
- `consume` fails explicitly with **Missing job output**; it does not invent a
  version or fall back to a producer-local environment variable.
- The workflow conclusion is failure even though the producer passed.

Repair: run again with the switch **false**. The input default and source files
have not changed; there is no broken main-branch code to revert.

## Exercise 4: Diagnose a mistaken cross-job environment variable

Inspect [the disabled challenge](../../challenges/03-environment-is-not-output.yml.disabled).
Its producer writes only `$GITHUB_ENV`; its consumer incorrectly expects
`$BUILD_VERSION` to exist just because it declares `needs`.

On a practice branch, use the active workflow to reproduce the misconception:

1. In `consume`, temporarily replace
   `RECEIVED_VERSION: ${{ needs.prepare.outputs.build_version }}` with
   `RECEIVED_VERSION: ${{ env.BUILD_VERSION }}`.
2. Commit and push, then manually dispatch that branch with omission false.
3. Observe that the consumer receives no version even though `prepare` succeeds.
4. Restore the original `needs.prepare.outputs.build_version` mapping.

Expected: `$GITHUB_ENV` updates remain inside the producing job. `needs` waits
for a job but does not copy its process environment. The repair requires an
explicit step output, job output mapping, and consumer reference.
Do not activate the challenge file or merge the broken practice change.

## Exercise 5: Rerun and reason about identity

Open a successful run and use **Re-run all jobs**. Compare its generated version
with the first attempt.

Expected: the package version, commit SHA and workflow run number stay the same;
`GITHUB_RUN_ATTEMPT` increases. The consumer must receive the new version from
that attempt, not a value copied from an older log.

Optional scope experiment: on a practice branch, remove only the step-level
`SCOPE_DEMO` override. Predict the inherited value before dispatching. The step
will read `job`, and its assertion will deliberately reject the missing override.
Restore it after observing the result.

## Troubleshooting

| Symptom | Cause or repair |
| --- | --- |
| Value is missing immediately after writing `$GITHUB_ENV` | Expected: the writer must use its local shell variable; the update is applied to subsequent steps. |
| A plain `export` disappears in the next step | Steps use separate shell processes; use `$GITHUB_ENV` for a later step. |
| Later step sees a version but the consumer does not | Check `$GITHUB_OUTPUT`, `id: version`, the job output mapping, `needs`, and output spelling. |
| `vars.LAB_BUILD_CHANNEL` seems missing | It is optional; inspect repository Variables, not Secrets. Unset variables resolve to an empty string. |
| `env.BUILD_VERSION` is empty in another job | It is not workflow-global runtime state. Read the producer's job output instead. |
| Renaming a step display name breaks nothing | Output references use the `id`, not the display name. Changing the ID requires updating references. |
| Version assertion fails after changing package version format | This example expects numeric `major.minor.patch`; inspect the producer and agree a new contract rather than hiding the failure. |
| Reported version changes on rerun | Expected: the attempt number is included. |
| Workflow does not run on push | Intentional: it is manual-only; Lab 1 still handles ordinary CI. |

The command files accept `NAME=value` for single-line data. Arbitrary multiline
values require GitHub's documented delimiter syntax or a file-transfer strategy.
Do not copy this single-line recipe for unvalidated multiline input. These
command-file paths are runner-provided and specific to the current step.

## Validation and completion checklist

Application tests remain unchanged: `npm test` should pass all seven tests.
With the optional local actionlint tool:

```powershell
actionlint .github\workflows\lab-01-fundamentals.yml .github\workflows\lab-02-matrix.yml .github\workflows\lab-03-variables-and-outputs.yml
```

Local YAML validation cannot prove hosted command-file processing or cross-job
transfer. Use the successful and deliberately failing hosted runs above.

- [ ] All seven application tests still pass.
- [ ] Active workflow syntax passes validation.
- [ ] Observe workflow, job and step values and confirm override isolation.
- [ ] Both jobs agree on the exact generated version in a normal run.
- [ ] Observe that `$GITHUB_ENV` is neither current-step nor cross-job state.
- [ ] Identify the `vars` fallback and, optionally, test a non-sensitive variable.
- [ ] Omission makes the producer pass but consumer explicitly fail.
- [ ] Repair the output transfer and explain every link in the chain.
- [ ] Compare rerun attempt metadata and restore practice-branch changes.

Stop for review before Lab 4. No build artefacts, packages or deployments are
created by this lab.

## Exam knowledge

### Platform facts

- Environment variables and outputs are different data-passing mechanisms.
- Scope precedence is step over job over workflow for applicable `env` values.
- `$GITHUB_ENV` affects later steps in the same job, not the writing process.
- `$GITHUB_OUTPUT` defines step outputs; an `id` is needed for named references.
- Cross-job transfer requires a job output mapping and a dependency reference.
- Missing context properties normally evaluate to empty strings; that is not
  proof that an output was successfully produced.
- `vars` is configuration, `github` is metadata, and `env` describes applicable
  environment values. They are not interchangeable namespaces.
- Job outputs are strings. If later used as booleans or numbers, explicitly
  consider conversion rather than relying on string truthiness.

### Common misunderstandings and outdated material

- "Writing `$GITHUB_ENV` makes a global workflow variable." Incorrect: job-local.
- "Writing `$GITHUB_OUTPUT` automatically sets `$build_version`." Incorrect:
  map the output to an environment variable if the shell needs it.
- "needs copies everything from the upstream runner." Incorrect: it provides
  dependency results and declared outputs, not the runner filesystem/environment.
- Old examples using `::set-output` or `::set-env` should not be copied.
  Use the supported environment files shown here.
- Outputs are not a secret-transfer mechanism. Do not write real secrets into
  them; GitHub may also suppress job outputs suspected of containing secrets.

### Engineering recommendations

Use environment variables for process configuration, outputs for explicit
computed-result contracts, and artefacts for files (Lab 4). Validate required
outputs instead of supplying misleading fallback versions. Use only selected,
non-sensitive context properties and pass values into shell scripts as data.

### Exam-style question

Job A writes `version=1.2.3` to `$GITHUB_OUTPUT` in a step with `id: metadata`.
Job B declares `needs: A`. What else is required for B to read the version?

**A.** Nothing: it is automatically available as `$version` in B.

**B.** A must map a job output to `steps.metadata.outputs.version`; B then reads
`needs.A.outputs.<mapped_name>`.

**C.** A must write the same line to `$GITHUB_ENV`, which shares it across jobs.

**D.** B must use `env.metadata.version`, because step IDs create global variables.

**Correct answer: B.**

- **A is incorrect:** a step output does not automatically become any shell
  variable, and it is not directly visible across jobs.
- **B is correct:** the job output is the explicit bridge from the producer's
  step result to the dependent job's `needs` context.
- **C is incorrect:** `$GITHUB_ENV` applies to later steps in A only.
- **D is incorrect:** step IDs are not global environment namespaces.

## Official references

- [Store information in variables](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables)
- [Context reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts)
- [Environment files and setting variables](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#environment-files)
- [Setting a step output](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#setting-an-output-parameter)
- [Passing information between jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs)
- [Default GitHub variables](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)
