# Safety and cost controls

## Boundaries

- No real credentials or secret values are used in exercises.
- Never print secrets, dump the entire process environment, or dump the complete
  `github` context. Selected non-sensitive default variables are enough.
- Never commit `.env` files, tokens, private keys or registry credentials.
- No cloud deployment, paid infrastructure, databases or external CI services.
- No organisation settings changes, personal access tokens or admin privileges.
- Do not use `pull_request_target` to execute untrusted pull request code.
- Later secret exercises use dummy values only. GitHub's built-in `GITHUB_TOKEN`
  is platform-provided; learners do not supply a personal credential.

## What Lab 1 does

The workflow requests only `contents: read`; unspecified token permissions are
set to none. Checkout does not persist Git credentials for later steps.
The single Ubuntu job has a five-minute timeout, no matrix, no schedule, no
artefact upload, and no publishing or deployment steps.

`push` is limited to `main`; `pull_request` is limited to PRs targeting `main`.
The default PR activities are opening, reopening and synchronizing (new commits).
Both PR testing and the subsequent merge push can run; those are separate,
intentional checks. Experiments may temporarily broaden triggers; restore the
baseline after observing the result.

## What Lab 2 adds

Lab 2 is manual-only. Its two Node.js versions x two test suites create four
matrix jobs with `max-parallel: 2`, plus up to two lightweight downstream jobs.
Every job has a five-minute timeout. The concurrency cap is not a limit on the
total jobs or total minutes.

The optional injection input deliberately fails one cell before installation.
It is off by default. `fail_fast` is also off by default so learners can inspect
all combinations; enabling it can cancel unfinished matrix jobs after failure.
There are no artificial delays, uploads, package writes or deployments.
The readiness job prints a message only; the report never overrides a failed
matrix. Do not replace these teaching steps with real publishing operations.

Run the manual experiments one at a time and restore practice-branch changes
before merging. Lab 1 continues to run its normal push/PR checks independently.

## What Lab 3 adds

Lab 3 is manual-only, with two sequential Ubuntu jobs and a five-minute timeout
per job. It generates and validates a non-sensitive version string; there is no
application build, artefact upload, package publication or deployment.

The optional `omit_output` input is false by default. Enabling it deliberately
breaks output transfer and produces a failed consumer job, not a successful
fallback. It changes no repository settings or source defaults.

An optional repository **variable** named `LAB_BUILD_CHANNEL` can contain the
non-sensitive label `training`. The workflow works without it, using `practice`.
This is not a secret exercise: never put credentials in configuration variables,
environment files, outputs or inputs. Do not change organisation variables.
Only selected non-sensitive metadata is printed, not entire contexts.

## Free-account use does not mean unlimited usage

Standard GitHub-hosted runners are free for public repositories. Private
repositories have included minutes/storage according to the account plan.
Limits and billing policies can change; consult the official links below.
No lab requires enabling paid usage, larger runners or a payment method.

Before running exercises:

1. Check personal Actions usage and billing settings. Do not enable paid usage
   for this lab.
2. Prefer short runs and only trigger the experiment you are observing.
3. Cancel redundant runs from the Actions UI. The five-minute job timeout limits
   a single job; it is not an account-wide spending cap.
4. Avoid setting lab workflows as required branch checks while experimenting
   with trigger filters: a skipped required workflow can leave a PR waiting.
5. Disable a workflow from the Actions UI when finished if you no longer want
   its push/PR checks.

Later GHCR publishing will require explicit manual opt-in. Package storage,
visibility and deletion will be explained before publishing is introduced.
GitHub environment protection features vary with plan and visibility; restricted
approval features will not be mandatory for a free-account exercise.

## Official references

- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GITHUB_TOKEN permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions)
- [Secure use of GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use)
