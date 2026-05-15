import * as vscode from 'vscode'
import type { RepoTreeProvider } from './repoTree'

export type TerminalOption = {
  id: string
  name: string
  label: string
  active: boolean
}

export type BranchOption = {
  name: string
}

type PanelMessage =
  | { type: 'selectAll' }
  | { type: 'clearSelection' }
  | { type: 'checkoutActive'; branch: string }
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
  private refreshTimer?: ReturnType<typeof setInterval>
  private activeTargetLabel = 'No worktree selected'
  private explicitAgentContextLabel: string | undefined

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly treeProvider: RepoTreeProvider,
    private readonly getTerminalOptions: () => Promise<TerminalOption[]>,
    private readonly getBranchOptions: () => BranchOption[],
    private readonly getCheckoutBranchOptions: () => BranchOption[],
    private readonly getCheckoutCurrentBranch: () => string,
    private readonly canCheckoutBranch: () => boolean,
    private readonly hasCheckoutTarget: () => boolean,
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

    this.treeProvider.onDidChangeSelection(() => { void this.postState() })
    this.refreshTimer = setInterval(() => { void this.postState() }, 2500)
    view.onDidDispose(() => {
      if (this.refreshTimer) clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    })
    void this.postState()
  }

  refresh() {
    void this.postState()
  }

  show() {
    this.view?.show()
  }

  setActiveTarget(label: string) {
    this.activeTargetLabel = label
    void this.postState()
  }

  composeAgent(label: string) {
    this.explicitAgentContextLabel = label
    this.view?.show()
    void this.view?.webview.postMessage({
      type: 'composeAgent',
      agentContextLabel: this.getAgentContextLabel(this.treeProvider.getSelectionSummary()),
    })
    void this.postState()
  }

  composeSelectedAgent() {
    this.explicitAgentContextLabel = undefined
    const summary = this.treeProvider.getSelectionSummary()
    this.view?.show()
    void this.view?.webview.postMessage({
      type: 'composeAgent',
      agentContextLabel: this.getAgentContextLabel(summary),
    })
    void this.postState()
  }

  resetAgentDraft() {
    void this.view?.webview.postMessage({ type: 'resetAgentDraft' })
  }

  clearAgentContext() {
    this.explicitAgentContextLabel = undefined
    void this.postState()
  }

  private async postState() {
    const summary = this.treeProvider.getSelectionSummary()
    void this.view?.webview.postMessage({
      type: 'state',
      selectedFiles: summary.selectedFiles,
      repositories: summary.repositories,
      activeTargetLabel: this.activeTargetLabel,
      agentContextLabel: this.getAgentContextLabel(summary),
      terminals: await this.getTerminalOptions(),
      branches: this.getBranchOptions(),
      checkoutBranches: this.getCheckoutBranchOptions(),
      checkoutCurrentBranch: this.getCheckoutCurrentBranch(),
      canCheckoutBranch: this.canCheckoutBranch(),
      hasCheckoutTarget: this.hasCheckoutTarget(),
    })
  }

  private getAgentContextLabel(summary: { selectedFiles: number }) {
    if (this.explicitAgentContextLabel) return this.explicitAgentContextLabel
    if (summary.selectedFiles > 0) return `${summary.selectedFiles} selected file(s)`
    return 'No agent context selected'
  }

  private render() {
    const nonce = getNonce()
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Worktree Diff Actions</title>
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
    .button-stack {
      display: grid;
      gap: 8px;
    }
    .spinner {
      display: inline-block;
      width: 11px;
      height: 11px;
      margin-right: 6px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      vertical-align: -1px;
      animation: spin 700ms linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .section {
      padding-top: 8px;
      margin-top: 8px;
      border-top: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
    }
    .checkout-controls {
      display: grid;
      gap: 8px;
      margin-bottom: 8px;
    }
    .checkout-controls select,
    .checkout-controls button {
      margin-bottom: 0;
    }
    .lock-note {
      margin: -2px 0 8px;
      color: var(--vscode-descriptionForeground);
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

    <div class="checkout-controls" id="checkoutControls">
      <select id="checkoutBranch" class="hidden"></select>
      <button id="checkout" class="secondary hidden">Checkout branch</button>
    </div>
    <p class="lock-note hidden" id="checkoutLocked">Branch checkout is locked for linked worktrees.</p>

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
    <div class="button-stack">
      <button id="sendAgent" class="primary">Send to terminal</button>
      <button id="clearAgentSelection" class="secondary">Clear selected files</button>
      <button id="refreshTerminals" class="secondary">Refresh terminals</button>
    </div>
    <p class="muted">Tip: select code in the diff/editor, then right-click and choose Send Selection to Agent. This panel will open with that snippet as context.</p>
  </section>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let selectedFiles = 0;
    let repositories = 0;
    let activeTab = 'commit';
    let checkoutCanRun = false;
    let checkoutHasTarget = false;

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
    const checkoutBranch = document.getElementById('checkoutBranch');
    const checkout = document.getElementById('checkout');
    const checkoutControls = document.getElementById('checkoutControls');
    const checkoutLocked = document.getElementById('checkoutLocked');
    const stashMessage = document.getElementById('stashMessage');
    const runGitAction = document.getElementById('runGitAction');
    const gitActionHint = document.getElementById('gitActionHint');
    const refreshTerminals = document.getElementById('refreshTerminals');
    const gated = ['clear', 'commit', 'clearAgentSelection']
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
    document.getElementById('clearAgentSelection').addEventListener('click', () => send('clearSelection'));
    refreshTerminals.addEventListener('click', () => {
      refreshTerminals.disabled = true;
      refreshTerminals.innerHTML = '<span class="spinner"></span>Refreshing terminals';
      send('refreshTerminals');
    });
    document.getElementById('sendAgent').addEventListener('click', () => send('sendAgent', {
      message: agentMessage.value,
      terminalName: terminal.value,
    }));
    document.getElementById('commit').addEventListener('click', () => send('commitSelected', {
      summary: summary.value,
      description: description.value,
    }));
    checkout.addEventListener('click', () => send('checkoutActive', { branch: checkoutBranch.value }));
    checkoutBranch.addEventListener('change', () => syncCheckoutState(checkoutCanRun, checkoutHasTarget, checkoutBranch.dataset.currentBranch || ''));
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

    function syncCheckoutState(canCheckout, hasTarget, currentBranch) {
      const hasBranch = checkoutBranch.options.length > 0;
      const selectedCurrentBranch = checkoutBranch.value === currentBranch;
      checkoutControls.classList.toggle('hidden', !canCheckout);
      checkoutBranch.classList.toggle('hidden', !canCheckout);
      checkout.classList.toggle('hidden', !canCheckout);
      checkoutLocked.classList.toggle('hidden', canCheckout || !hasTarget);
      checkout.disabled = !canCheckout || !hasBranch || selectedCurrentBranch;
      checkoutBranch.disabled = !canCheckout || !hasBranch;
    }

    window.addEventListener('message', event => {
      if (event.data.type === 'composeAgent') {
        agentContext.textContent = event.data.agentContextLabel || 'Selected context';
        setTab('agent');
        return;
      }
      if (event.data.type === 'resetAgentDraft') {
        agentMessage.value = '';
        return;
      }
      if (event.data.type !== 'state') return;
      selectedFiles = event.data.selectedFiles || 0;
      repositories = event.data.repositories || 0;
      checkoutCanRun = Boolean(event.data.canCheckoutBranch);
      checkoutHasTarget = Boolean(event.data.hasCheckoutTarget);
      const currentCheckoutBranch = event.data.checkoutCurrentBranch || '';
      target.textContent = event.data.activeTargetLabel || 'No worktree selected';
      agentContext.textContent = event.data.agentContextLabel || 'No agent context selected';
      count.textContent = selectedFiles + (selectedFiles === 1 ? ' file' : ' files') + (repositories > 1 ? ' / ' + repositories + ' worktrees' : '');
      agentCount.textContent = count.textContent;
      gated.forEach(button => button.disabled = selectedFiles === 0);
      refreshTerminals.disabled = false;
      refreshTerminals.textContent = 'Refresh terminals';
      syncGitActionState();
      const oldValue = terminal.value;
      const oldBranch = rebaseBranch.value;
      terminal.innerHTML = '';
      for (const item of event.data.terminals || []) {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.active ? item.label + ' (active)' : item.label;
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
      checkoutBranch.innerHTML = '';
      checkoutBranch.dataset.currentBranch = currentCheckoutBranch;
      for (const item of event.data.checkoutBranches || []) {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.name;
        checkoutBranch.appendChild(option);
      }
      if ([...checkoutBranch.options].some(option => option.value === currentCheckoutBranch)) checkoutBranch.value = currentCheckoutBranch;
      syncCheckoutState(checkoutCanRun, checkoutHasTarget, currentCheckoutBranch);
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
