# GitHub Actions Real-World Lab

A practical GitHub Actions certification learning laboratory, not a production
application. The workload is a tiny Node.js command-line greeting program: the
workflows, experiments and troubleshooting are the product.

## Start here

1. Read [prerequisites and repository setup](docs/prerequisites.md).
2. Read [safety and cost controls](docs/safety-and-costs.md).
3. Work through [Lab 1: Workflow fundamentals](labs/01-workflow-fundamentals/README.md).

On Windows, open PowerShell in the project folder:

```powershell
npm ci
npm test
npm start
```

Node.js 24 LTS is the baseline. There are no third-party application dependencies.
Keep the lockfile: the workflow deliberately teaches `npm ci` even for this small
workload. Docker is not needed until Lab 6.

## Learning path

| Lab | Focus | Status |
| --- | --- | --- |
| 1 | Workflow structure, triggers, inputs, runners and environment variables | Available |
| 2 | Multidimensional matrix, parallelism and job dependencies | Awaiting approval |
| 3 | Variable scopes, contexts and step/job outputs | Awaiting approval |
| 4 | Workflow artefacts, retention and packages | Awaiting approval |
| 5 | Dummy secrets, token permissions, external secrets and OIDC | Awaiting approval |
| 6 | Docker and explicitly enabled GHCR publishing | Awaiting approval |
| 7 | Custom actions, reuse and lifecycle cleanup | Awaiting approval |
| 8 | Integrated CI/CD and manual simulated deployment | Awaiting approval |

Only Lab 1 is implemented. Later labs will be added individually after review;
there are no placeholder workflows that appear to implement later objectives.

## Current layout

- [Active workflow](.github/workflows/lab-01-fundamentals.yml): runs on pushes to
  `main`, pull requests targeting `main`, and manual dispatch.
- [Application](src/index.js) and [tests](tests/greeting.test.js): minimal CI workload.
- [Labs](labs/01-workflow-fundamentals/README.md): scenarios, YAML explanations,
  practical tasks, troubleshooting and exam knowledge.
- [Challenges](challenges/README.md): intentionally broken, disabled examples.
- [Documentation](docs/prerequisites.md): setup and shared safety guidance.

The local folder may remain named `github-actions-lab`; the project and intended
GitHub repository name are `github-actions-real-world-lab`.

## Version policy

The workflow uses official GitHub-maintained `actions/checkout@v7` and
`actions/setup-node@v7`, the current major versions checked for this lab.
Checkout makes repository files available; setup-node selects Node.js 24 for
the application. An action's own JavaScript runtime and the application's Node.js
version are different settings.

Major action tags receive compatible updates, making this introductory YAML
readable. They are mutable, not immutable pins. Pinning reviewed full commit SHAs
is a stronger supply-chain control and will be discussed in Lab 5. Recheck
[checkout releases](https://github.com/actions/checkout/releases),
[setup-node releases](https://github.com/actions/setup-node/releases), and the
[Node.js support schedule](https://nodejs.org/en/about/previous-releases)
when revisiting this repository. Local validation uses Node.js 24; `engines`
also permits supported Node.js 22 and 26 for later matrix exercises.

`ubuntu-latest` is a moving GitHub-hosted Ubuntu runner label, not a fixed OS
version. No self-hosted runner, cloud account or administrator privileges are
needed. See [the Lab 1 validation instructions](labs/01-workflow-fundamentals/README.md#local-validation)
for the distinction between local checks and a real hosted run.
