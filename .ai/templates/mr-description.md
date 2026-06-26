# Merge Request: [Task ID] - [Title]

## 1. Summary
[Provide a clear, brief explanation of the changes introduced by this Merge Request.]

---

## 2. Changes Manifest
Detailed changes grouping by file modifications:

- **[NEW / MODIFY]** `[file-path]`
  - [List of features / functions implemented]

---

## 3. Testing & Verification

### Automated Verification
- [ ] `pnpm run typecheck` passes with exit code 0.
- [ ] `pnpm run lint` passes without errors.
- [ ] `pnpm run test` executes successfully. Output:
  ```text
  [Paste Jest execution outcomes here]
  ```

### Manual Verification
- [Describe manual reproduction steps or local database records validation verified by the agent]

---

## 4. Definition of Done Checklist
- [ ] Code follows Controller -> Service -> Repository layer architecture rules.
- [ ] Sensitive properties are sanitized and excluded from return endpoints.
- [ ] Database queries are scoped using `merchant_id` tenant filters.
- [ ] No temporary debug statements or placeholder TODO comments remain.
- [ ] Accompanying unit/integration specs exist and compile cleanly.
- [ ] Database schema migrations are verified and executed.
