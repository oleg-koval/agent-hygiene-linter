import { preparedPlaybooks } from "./demo-data.js";

export function renderHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Refactor Playbook Runner</title>
    <style>
      :root { color-scheme: dark; }
      body { font-family: system-ui, sans-serif; margin: 0; background: #0f1117; color: #e6e6e6; }
      main { max-width: 980px; margin: 0 auto; padding: 24px; }
      textarea, input { width: 100%; box-sizing: border-box; border-radius: 12px; border: 1px solid #2c3140; background: #171a23; color: inherit; padding: 12px; font: inherit; }
      textarea { min-height: 320px; resize: vertical; }
      label { display: block; margin: 16px 0 8px; font-weight: 600; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      button { border: 0; border-radius: 12px; background: #6d5efc; color: white; padding: 12px 16px; font: inherit; font-weight: 700; cursor: pointer; }
      button:hover { filter: brightness(1.05); }
      pre { white-space: pre-wrap; word-break: break-word; background: #171a23; border: 1px solid #2c3140; border-radius: 12px; padding: 12px; overflow: auto; }
      .hint { color: #9aa4b2; font-size: 0.95rem; }
      .actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
      .pill { background: #171a23; border: 1px solid #2c3140; padding: 8px 12px; border-radius: 999px; }
      .preset-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
      .preset-card { border: 1px solid #2c3140; border-radius: 12px; background: #171a23; padding: 12px; display: grid; gap: 8px; }
      .preset-card button { width: 100%; }
      .preset-title { font-weight: 700; }
      .preset-copy { color: #9aa4b2; font-size: 0.92rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>AI Refactor Playbook Runner</h1>
      <p class="hint">Paste a playbook or point at a local markdown file. Bind the server to 0.0.0.0 and open it from your Tailscale IP on mobile.</p>
      <section aria-labelledby="prepared-data-title">
        <h2 id="prepared-data-title">Prepared data</h2>
        <p class="hint">One-tap fixtures for phone testing. They fill the form with a safe smoke run or a real repo test.</p>
        <div id="prepared-playbooks" class="preset-grid"></div>
      </section>
      <form id="run-form">
        <label for="playbook-file">Playbook file picker</label>
        <input id="playbook-file" type="file" accept=".md,.markdown,text/markdown" />

        <label for="playbook-path">Playbook file path</label>
        <input id="playbook-path" name="playbookPath" placeholder="/Users/olegkoval/projects/personal/active/mvps/ai-refactor-playbook-runner/examples/demo.md" />

        <label for="playbook">Playbook markdown</label>
        <textarea id="playbook" name="playbook" placeholder="# Refactor..."></textarea>

        <div class="row">
          <div>
            <label for="cwd">Working directory</label>
            <input id="cwd" name="cwd" placeholder="/Users/olegkoval/projects/..." />
          </div>
          <div>
            <label for="statePath">State file</label>
            <input id="statePath" name="statePath" placeholder=".ai-refactor-playbook-runner-state.json" />
          </div>
        </div>

        <div class="actions">
          <label class="pill"><input type="checkbox" id="dryRun" name="dryRun" /> dry-run</label>
          <label class="pill"><input type="checkbox" id="resume" name="resume" /> resume</label>
          <button type="submit">Run playbook</button>
        </div>
      </form>
      <h2>Result</h2>
      <pre id="result">Waiting for a run.</pre>
    </main>
    <script>
      const form = document.getElementById('run-form');
      const result = document.getElementById('result');
      const filePicker = document.getElementById('playbook-file');
      const playbookPathInput = document.getElementById('playbook-path');
      const playbookInput = document.getElementById('playbook');
      const cwdInput = document.getElementById('cwd');
      const statePathInput = document.getElementById('statePath');
      const dryRunInput = document.getElementById('dryRun');
      const resumeInput = document.getElementById('resume');
      const preparedPlaybooks = ${JSON.stringify(preparedPlaybooks)};

      function loadPreparedPlaybook(playbookId) {
        const preset = preparedPlaybooks.find((entry) => entry.id === playbookId);
        if (preset === undefined) {
          return;
        }

        playbookPathInput.value = '';
        playbookInput.value = preset.playbook;
        cwdInput.value = preset.cwd;
        statePathInput.value = preset.statePath;
        dryRunInput.checked = preset.dryRun;
        resumeInput.checked = preset.resume;
      }

      const preparedPlaybooksNode = document.getElementById('prepared-playbooks');
      preparedPlaybooksNode.innerHTML = preparedPlaybooks
        .map((preset) =>
          '<div class="preset-card">' +
          '<div>' +
          '<div class="preset-title">' + preset.label + '</div>' +
          '<div class="preset-copy">' + preset.description + '</div>' +
          '</div>' +
          '<button type="button" data-playbook-id="' + preset.id + '">Load ' + preset.label + '</button>' +
          '</div>',
        )
        .join('');

      preparedPlaybooksNode.querySelectorAll('button[data-playbook-id]').forEach((button) => {
        button.addEventListener('click', () => {
          loadPreparedPlaybook(button.getAttribute('data-playbook-id'));
        });
      });

      filePicker.addEventListener('change', async () => {
        const file = filePicker.files?.[0];
        if (file === undefined) {
          return;
        }

        playbookPathInput.value = '';
        playbookInput.value = await file.text();
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        result.textContent = 'Running...';
        const payload = {
          playbookPath: playbookPathInput.value || undefined,
          playbook: playbookInput.value || undefined,
          cwd: cwdInput.value || undefined,
          statePath: statePathInput.value || undefined,
          dryRun: dryRunInput.checked,
          resume: resumeInput.checked,
        };

        const response = await fetch('/api/run', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await response.text();
        result.textContent = body;
      });
    </script>
  </body>
</html>`;
}
