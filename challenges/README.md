# Intentionally broken challenges

These are teaching fixtures, not active workflows.

All broken workflow examples:

- Live outside `.github/workflows`.
- End in `.yml.disabled`, not `.yml`.
- Must be inspected and fixed as part of a named exercise before activation.

GitHub discovers workflows only in `.github/workflows` with a `.yml` or `.yaml`
extension. Merely storing these fixtures here cannot run them.

Start with [Lab 1: missing checkout](01-missing-checkout.yml.disabled).
The [lab instructions](../labs/01-workflow-fundamentals/README.md#exercise-4-break-and-fix-checkout)
explain how to reproduce it safely by temporarily editing the existing workflow.
Do not copy every challenge into the active workflow directory.

Next, [Lab 2: missing needs](02-missing-needs.yml.disabled) demonstrates valid
YAML with a broken dependency gate. Follow the
[Lab 2 exercise](../labs/02-matrix-strategies/README.md#exercise-5-break-and-fix-a-dependency)
to reproduce it on a practice branch and restore the dependency afterwards.
