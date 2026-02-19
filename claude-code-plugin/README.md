# Sidekick Claude Code plugin

This implements hooks for Claude Code to provide the following hooks to give it superpowers.

## Key Idea

`claude code` cli is terminal based chat interface. This means it is incapable of rendering rich output like HTML tables, Mermaid charts etc. This extension provides a way to render rich output in VSCode.

## Lifecycle Hooks

- SessionStart: Called when a new session is started. It ensures that there is /tmp/claude-code-sidekick folder. Create a session specific markdown file and launches VSCode (code executable needs to be on your PATH variable).
- UserPromptSubmit: Called before a model is invoked. This basically adds the prompt to the session specific file in markdown format.
- Stop: Called after a model responds to the user. This appends the model response to the per session file.
  - With each volley with the model, the above two hooks are called over and over. If there is any rich output in the model response, it is rendered in VSCode and markdown support takes care of the rest. Thus the VSCode acts as a sidekick to the Gemini CLI like Robin to Batman.
- SessionEnd: Called when a the session ends. This deletes the per session file.

### Prerequisites

- Claude Code

## Installation

### Steps

```bash
git clone https://github.com/sandipchitale/sidekick-gc-cc
cd sidekick-gc-cc
# local
claude --plugin-dir ./claude-code-plugin

# Alternatively

# install plugin
claude
/plugin
# Goto Marketplace tab
# Select Add Marketplace
./claude-code-plugin
/quit
claude
# Enjoy installed sidekick plugin
```

## Sandbox issues

You may have to unsandbox some commands for the hooks to work. Run with `--show-dashboatd` to show the Dashboard and got to the Tools section.
