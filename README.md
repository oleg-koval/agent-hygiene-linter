# AI Refactor Playbook Runner

Markdown-driven playbook runner for repeatable refactors.

## What it does

- Parses playbooks from markdown files
- Supports inheritance, variables, retries, timeouts, dry-run, and resume
- Runs from CLI or a browser UI
- Exposes a local server you can reach from mobile over Tailscale

## Quick start

```bash
npm install
npm run build
npm run test
```

## CLI

Run a playbook file:

```bash
node dist/cli.js run examples/demo.md
```

Dry-run it:

```bash
node dist/cli.js run examples/demo.md --dry-run
```

Start the web UI:

```bash
node dist/cli.js serve --host 0.0.0.0 --port 8787
```

Then open:

- `http://127.0.0.1:8787` locally
- `http://<your-tailscale-ip>:8787` from mobile on Tailscale
- or your MagicDNS hostname if you have one

## Playbook format

A playbook is markdown with these sections:

- `# Title`
- `## Objective`
- `## Preconditions`
- `## Inherited Template`
- `## Variables`
- `## Steps`
- `## Validation`
- `## Rollback`
- `## Success Criteria`
- `## Kill Criteria`

Step fields:

- `name`
- `command`
- `cwd`
- `retries`
- `timeout_seconds`

Variables use `{{placeholder}}` syntax and are merged from the playbook plus runtime overrides.

## Example

See `examples/demo.md`.
