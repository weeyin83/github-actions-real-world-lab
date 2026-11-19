# Prerequisites and repository setup

## Tools and accounts

- A free GitHub account and a repository where you have write access.
- Standard VS Code and Git.
- Node.js 24 LTS, including npm, from the [official Node.js site](https://nodejs.org/).
  An existing compatible installation or a user-local portable distribution is
  sufficient; this project does not require an administrator installation.
- A terminal. Local examples use PowerShell on Windows; hosted Ubuntu `run`
  steps use Bash. Do not copy Bash variable syntax directly into PowerShell.

Verify your local tools:

```powershell
git --version
node --version
npm --version
```

If PowerShell blocks the npm script shim, use `npm.cmd` instead of `npm`. There
is no need to change your machine's execution policy for this lab.

No Docker, cloud CLI, personal access token or secret is needed for Lab 1.
The optional GitHub Actions VS Code extension can assist with YAML editing, but
is not required.

## Run locally

From the project root:

```powershell
npm ci
npm test
npm start
$env:LEARNER_NAME = 'Alex'
npm start
Remove-Item Env:\LEARNER_NAME
```

Expected: four passing tests and a greeting using `engineer` or `Alex`.
`npm ci` succeeds even though there are currently no dependencies: the committed
lockfile supplies the reproducible installation contract used by CI.

## Put the project on GitHub

The initial local branch is `main`. Nothing is automatically committed, pushed
or created on GitHub by the lab.

1. In GitHub's web UI, create an empty repository named
   `github-actions-real-world-lab` under your personal account. Do not initialize
   it with another README, licence or gitignore.
2. Public visibility is a convenient option for non-sensitive learning material;
   private repositories also work for Lab 1 but have usage allowances. Read
   [safety and cost controls](safety-and-costs.md) before choosing.
3. Review the files, then use VS Code Source Control to stage and commit them.
   If Git needs an author identity, configure your preferred public display name
   and GitHub-provided no-reply email. Never put credentials into a commit.
4. Add the empty repository as `origin` using VS Code's Git commands, then push
   `main`. Use your normal GitHub sign-in flow; never paste credentials into
   workflow files or documentation.
5. In GitHub, check that `main` is the default branch and Actions is available.
   If an organisation policy blocks actions, use an allowed personal repository;
   do not change organisation settings for this lab.

The first push to `main` should trigger Lab 1. Open the **Actions** tab to see it.
Manual dispatch becomes available after the workflow exists on the default
branch. See [Lab 1](../labs/01-workflow-fundamentals/README.md#run-the-workflow)
for the exact UI steps and exercises.

## Authoritative references

- [Quickstart for GitHub Actions](https://docs.github.com/en/actions/get-started/quickstart)
- [Manually running a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [Node.js releases](https://nodejs.org/en/about/previous-releases)
