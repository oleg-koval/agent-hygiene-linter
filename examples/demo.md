# Refactor API client

## Objective

Make the API client deterministic and easier to test.

## Preconditions

- Repo is clean enough to run refactor steps.
- `npm test` passes before the refactor starts.

## Inherited Template

## Variables

- repo_root: /Users/olegkoval/projects/personal/active/mvps/ai-refactor-playbook-runner
- package_manager: npm

## Steps

1. Baseline tests
   - command: npm test
   - cwd: {{repo_root}}
   - retries: 1
   - timeout_seconds: 180
2. Typecheck
   - command: npm run typecheck
   - cwd: {{repo_root}}
   - retries: 0
   - timeout_seconds: 180
3. Build
   - command: npm run build
   - cwd: {{repo_root}}
   - retries: 0
   - timeout_seconds: 180

## Validation

- `npm test`
- `npm run typecheck`
- `npm run build`

## Rollback

- Revert the refactor branch.
- Restore the previous implementation from git.

## Success Criteria

- Tests stay green.
- Build emits clean output.
- No behavior change outside the refactor target.

## Kill Criteria

- Typecheck fails.
- Tests fail after the refactor.
- Build breaks or command output is non-deterministic.
