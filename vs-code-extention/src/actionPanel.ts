import * as vscode from 'vscode'
import type { RepoTreeProvider } from './repoTree'

export type TerminalOption = {
  name: string
  active: boolean
}

export type BranchOption = {
  name: string
}

type PanelMessage =
  | { type: 'selectAll' }
  | { type: 'clearSelection' }
  | { type: 'stageSelected' }
  | { type: 'unstageSelected' }
  | { type: 'discardSelected' }
  | { type: 'ignoreSelected' }
  | { type: 'commitSelected'; summary: string; description: string }
  | { type: 'amendSelected'; summary: string; description: string }
  | { type: 'fetchActive' }
  | { type: 'pullActive' }
  | { type: 'pushActive' }
  | { type: 'stashActive'; message: string }
  | { type: 'rebaseActive'; branch: string }
  | { type: 'sendAgent'; message: string; terminalName: string }
  | { type: 'refreshTerminals' }

export class ActionPanelProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView
  private activeTargetLabel = 'No worktree selected'
  private agentContextLabel = 'No agent context selected'

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly treeProvider: RepoTreeProvider,
    private readonly getTerminalOptions: () => TerminalOption[],
    private readonly getBranchOptions: () => BranchOption[],
    private readonly handleMessage: (message: PanelMessage) => Promise<void>,
  ) {}

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    }

    view.webview.html = this.render()
    view.webview.onDidReceiveMessage(message => {
      void this.handleMessage(message as PanelMessage)
    })

    this.treeProvider.onDidChangeSelection(() => this.postState())
    this.postState()
  }

  refresh() {
    this.postState()
  }

  show() {
    this.view?.show()
  }

  setActiveTarget(label: string) {
    this.activeTargetLabel = label
    this.postState()
  }

  composeAgent(label: string) {
    this.agentContextLabel = label
    this.view?.show()
    void this.view?.webview.postMessage({
      type: 'composeAgent',
      agentContextLabel: this.agentContextLabel,
    })
    this.postState()
  }

  private postState() {
    const summary = this.treeProvider.getSelectionSummary()
    void this.view?.webview.postMessage({
      type: 'state',
      selectedFiles: summary.selectedFiles,
      repositories: summary.repositories,
      activeTargetLabel: this.activeTargetLabel,
      agentContextLabel: this.agentContextLabel === 'No agent context selected' && summary.selectedFiles > 0
        ? `${summary.selectedFiles} selected file(s)`
        : this.agentContextLabel,
      terminals: this.getTerminalOptions(),
      branches: this.getBranchOptions(),
    })
  }

  private render() {
    const nonce = getNonce()
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Git Worktree Diff Actions</title>
  <style>
    :root {
      color-scheme: light dark;
      --gap: 8px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 8px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--gap);
      margin-bottom: 8px;
    }
    .muted, .count, .target {
      color: var(--vscode-descriptionForeground);
    }
    .count, .target {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .target {
      margin: -2px 0 8px;
    }
    .tabs, .grid {
      display: grid;
      gap: var(--gap);
      margin-bottom: 8px;
    }
    .tabs, .grid.two {
      grid-template-columns: 1fr 1fr;
    }
    .grid.three {
      grid-template-columns: 1fr 1fr 1fr;
    }
    button, input, textarea, select {
      width: 100%;
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 4px;
      font: inherit;
    }
    button, select {
      min-height: 28px;
    }
    button {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      cursor: pointer;
    }
    button.secondary, button.tab {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    button.tab.active {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
    }
    button.danger {
      color: var(--vscode-errorForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    button:disabled {
      opacity: 0.45;
      cursor: default;
    }
    input, textarea, select {
      display: block;
      margin-bottom: 8px;
      padding: 7px 8px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
    }
    textarea {
      min-height: 74px;
      resize: vertical;
    }
    textarea.agent {
      min-height: 120px;
    }
    .section {
      padding-top: 8px;
      margin-top: 8px;
      border-top: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
    }
    .primary {
      min-height: 32px;
      font-weight: 600;
    }
    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="tabs">
    <button id="commitTab" class="tab active">Commit</button>
    <button id="agentTab" class="tab">Agent</button>
  </div>

  <section id="commitPanel">
    <div class="bar">
      <strong>Selected Changes</strong>
      <span class="count" id="count">0 files</span>
    </div>
    <div class="target" id="target">No worktree selected</div>

    <div class="grid two">
      <button id="selectAll" class="secondary">Select all</button>
      <button id="clear" class="secondary">Clear</button>
    </div>

    <input id="summary" placeholder="Summary (required)">
    <textarea id="description" placeholder="Description"></textarea>
    <button id="commit" class="primary">Commit selected</button>

    <div class="section">
      <select id="gitAction">
        <optgroup label="Selected files">
          <option value="stageSelected">Stage selected files</option>
          <option value="unstageSelected">Unstage selected files</option>
          <option value="ignoreSelected">Add selected files to .gitignore</option>
          <option value="discardSelected">Discard selected changes...</option>
          <option value="amendSelected">Amend latest commit with selected files...</option>
        </optgroup>
        <optgroup label="Current worktree">
          <option value="fetchActive">Fetch</option>
          <option value="pullActive">Pull</option>
          <option value="pushActive">Push</option>
          <option value="stashActive">Stash changes...</option>
          <option value="rebaseActive">Rebase onto branch...</option>
        </optgroup>
      </select>
      <select id="rebaseBranch" class="hidden"></select>
      <input id="stashMessage" class="hidden" placeholder="Stash message">
      <button id="runGitAction" class="secondary">Run Git action</button>
      <p class="muted" id="gitActionHint">Choose a selected-file or current-worktree action.</p>
    </div>
  </section>

  <section id="agentPanel" class="hidden">
    <div class="bar">
      <strong>Agent Message</strong>
      <span class="count" id="agentCount">0 files</span>
    </div>
    <div class="target" id="agentContext">No agent context selected</div>

    <select id="terminal"></select>
    <textarea id="agentMessage" class="agent" placeholder="Ask Codex, Claude, or Gemini about the selected file(s) or highlighted code"></textarea>
    <button id="sendAgent" class="primary">Send to terminal</button>
    <button id="refreshTerminals" class="secondary">Refresh terminals</button>
    <p class="muted">Tip: select code in the diff/editor, then right-click and choose Send Selection to Agent. This panel will open with that snippet as context.</p>
  </section>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let selectedFiles = 0;
    let repositories = 0;
    let activeTab = 'commit';

    const summary = document.getElementById('summary');
    const description = document.getElementById('description');
    const count = document.getElementById('count');
    const agentCount = document.getElementById('agentCount');
    const target = document.getElementById('target');
    const agentContext = document.getElementById('agentContext');
    const terminal = document.getElementById('terminal');
    const agentMessage = document.getElementById('agentMessage');
    const commitPanel = document.getElementById('commitPanel');
    const agentPanel = document.getElementById('agentPanel');
    const commitTab = document.getElementById('commitTab');
    const agentTab = document.getElementById('agentTab');
    const gitAction = document.getElementById('gitAction');
    const rebaseBranch = document.getElementById('rebaseBranch');
    const stashMessage = document.getElementById('stashMessage');
    const runGitAction = document.getElementById('runGitAction');
    const gitActionHint = document.getElementById('gitActionHint');
    const gated = ['clear', 'commit']
      .map(id => document.getElementById(id));
    const selectedFileActions = new Set(['stageSelected', 'unstageSelected', 'ignoreSelected', 'discardSelected', 'amendSelected']);

    function send(type, extra = {}) {
      vscode.postMessage({ type, ...extra });
    }

    function setTab(tab) {
      activeTab = tab;
      commitPanel.classList.toggle('hidden', tab !== 'commit');
      agentPanel.classList.toggle('hidden', tab !== 'agent');
      commitTab.classList.toggle('active', tab === 'commit');
      agentTab.classList.toggle('active', tab === 'agent');
      if (tab === 'agent') agentMessage.focus();
    }

    commitTab.addEventListener('click', () => setTab('commit'));
    agentTab.addEventListener('click', () => setTab('agent'));
    document.getElementById('selectAll').addEventListener('click', () => send('selectAll'));
    document.getElementById('clear').addEventListener('click', () => send('clearSelection'));
    document.getElementById('refreshTerminals').addEventListener('click', () => send('refreshTerminals'));
    document.getElementById('sendAgent').addEventListener('click', () => send('sendAgent', {
      message: agentMessage.value,
      terminalName: terminal.value,
    }));
    document.getElementById('commit').addEventListener('click', () => send('commitSelected', {
      summary: summary.value,
      description: description.value,
    }));
    gitAction.addEventListener('change', syncGitActionState);
    runGitAction.addEventListener('click', () => {
      if (gitAction.value === 'amendSelected') {
        send('amendSelected', {
          summary: summary.value,
          description: description.value,
        });
        return;
      }
      if (gitAction.value === 'rebaseActive') {
        send('rebaseActive', { branch: rebaseBranch.value });
        return;
      }
      if (gitAction.value === 'stashActive') {
        send('stashActive', { message: stashMessage.value });
        return;
      }
      send(gitAction.value);
    });

    function syncGitActionState() {
      const needsSelection = selectedFileActions.has(gitAction.value);
      const needsBranch = gitAction.value === 'rebaseActive';
      const needsStashMessage = gitAction.value === 'stashActive';
      rebaseBranch.classList.toggle('hidden', !needsBranch);
      stashMessage.classList.toggle('hidden', !needsStashMessage);
      runGitAction.disabled = (needsSelection && selectedFiles === 0) || (needsBranch && !rebaseBranch.value);
      gitActionHint.textContent = needsBranch
        ? 'Choose the branch to rebase onto, then run.'
        : needsStashMessage
          ? 'Optional stash message. No popup required.'
          : needsSelection
        ? 'This action applies to checked files.'
        : 'This action applies to the selected worktree/repo.';
    }

    window.addEventListener('message', event => {
      if (event.data.type === 'composeAgent') {
        agentContext.textContent = event.data.agentContextLabel || 'Selected context';
        setTab('agent');
        return;
      }
      if (event.data.type !== 'state') return;
      selectedFiles = event.data.selectedFiles || 0;
      repositories = event.data.repositories || 0;
      target.textContent = event.data.activeTargetLabel || 'No worktree selected';
      agentContext.textContent = event.data.agentContextLabel || 'No agent context selected';
      count.textContent = selectedFiles + (selectedFiles === 1 ? ' file' : ' files') + (repositories > 1 ? ' / ' + repositories + ' worktrees' : '');
      agentCount.textContent = count.textContent;
      gated.forEach(button => button.disabled = selectedFiles === 0);
      syncGitActionState();
      const oldValue = terminal.value;
      const oldBranch = rebaseBranch.value;
      terminal.innerHTML = '';
      for (const item of event.data.terminals || []) {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.active ? '* ' + item.name + ' (active)' : item.name;
        terminal.appendChild(option);
      }
      if ([...terminal.options].some(option => option.value === oldValue)) terminal.value = oldValue;
      rebaseBranch.innerHTML = '';
      for (const item of event.data.branches || []) {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.name;
        rebaseBranch.appendChild(option);
      }
      if ([...rebaseBranch.options].some(option => option.value === oldBranch)) rebaseBranch.value = oldBranch;
      syncGitActionState();
    });
  </script>
</body>
</html>`
  }
}

function getNonce() {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let text = ''
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}
