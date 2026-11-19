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
