# Sidekick Gemini CLI extensions

This implements hooks for Gemini CLI to provide the following hooks to give it superpowers..

## Key Idea

`gemini` cli is terminal based chat interface. This means it is incapable of rendering rich output like HTML tables, Mermaid charts etc. This extension provides a way to render rich output in VSCode.

## Lifecycle Hooks

- SessionStart: Called when a new session is started. It ensures that there is /tmp/gemini-cli-sidekick folder. Create a session specific markdown file and launches VSCode (code executable needs to be on your PATH variable).
- BeforeModel: Called before a model is invoked. This basically adds the prompt to the session specific file in markdown format.
- AfterModel: Called after a model responds (chucks). This appends the model response to the per session file.
  - With each volley with the model, the above two hooks are called over and over. If there is any rich output in the model response, it is rendered in VSCode and markdown support takes care of the rest. Thus the VSCode acts as a sidekick to the Gemini CLI like Robin to Batman.
- SessionEnd: Called when a the session ends. This deletes the per session file.

### Prerequisites

- Gemini CLI

## Installation

### Steps

```bash
git clone https://github.com/sandipchitale/sidekick-gc-cc
cd sidekick-gc-cc/gemini-cli-extension
gemini extension link .
```

#### Settings

```bash
gemini extensions config sidekick
Configuring settings for "sidekick"...
✔ Setting "Keep Session File" (GEMINI_SIDEKICK_KEEP_SESSION_FILE) is already set. Overwrite? … yes
? Keep Session File
Whether to keep the session file after the session ends. › false (default) | true
```
