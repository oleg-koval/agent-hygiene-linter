export interface PreparedPlaybook {
  id: string;
  label: string;
  description: string;
  playbook: string;
  cwd: string;
  statePath: string;
  dryRun: boolean;
  resume: boolean;
}

const repoRoot =
  "/Users/olegkoval/projects/personal/active/mvps/ai-refactor-playbook-runner";

export const preparedPlaybooks: PreparedPlaybook[] = [
  {
    id: "smoke",
    label: "Smoke test",
    description: "Fast dry-run for mobile tap testing.",
    cwd: repoRoot,
    statePath: ".ai-refactor-playbook-runner-state.json",
    dryRun: true,
    resume: false,
    playbook: `# Mobile smoke test

## Objective
Prove the runner works from a phone.

## Preconditions
- open the Tailscale URL

## Steps
1. Say hello
   - command: echo mobile smoke
   - cwd: ${repoRoot}
   - retries: 0
   - timeout_seconds: 10

## Validation
- the output contains mobile smoke

## Success Criteria
- the UI can launch a prepared run with one tap
`,
  },
  {
    id: "repo-test",
    label: "Repo test run",
    description: "Runs the local test suite in the MVP repo.",
    cwd: repoRoot,
    statePath: ".ai-refactor-playbook-runner-state.json",
    dryRun: false,
    resume: false,
    playbook: `# Repo test run

## Objective
Exercise a real command path against this MVP.

## Preconditions
- npm deps are installed

## Steps
1. Run tests
   - command: npm test
   - cwd: ${repoRoot}
   - retries: 0
   - timeout_seconds: 180

## Validation
- test output completes cleanly

## Success Criteria
- the runner can execute a non-dry-run prepared payload
`,
  },
];
