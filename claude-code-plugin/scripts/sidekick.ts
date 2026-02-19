import { appendFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, readFileSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';

// Helper functions (formerly in utils.ts)
async function readStdin(): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
}

async function readJsonStdin<T>(): Promise<T> {
    const stdin = await readStdin();
    return JSON.parse(stdin);
}


function getSidekickDir(): string {
    const sidekickDir = join(tmpdir(), 'claude-code-sidekick');
    mkdirSync(sidekickDir, { recursive: true });
    const vscodeDir = join(sidekickDir, '.vscode');
    mkdirSync(vscodeDir, { recursive: true });
    const vscodeSettingsJson = join(vscodeDir, 'settings.json');
    if (!existsSync(vscodeSettingsJson)) {
        writeFileSync(vscodeSettingsJson, '{ "workbench.editorAssociations": { "*.md": "vscode.markdown.preview.editor" }, "explorer.autoReveal": false}\n');
    }
    return sidekickDir;
}

function getVolleyFilePath(sessionId: string): string {
    return join(getSidekickDir(), `${sessionId}.md`);
}

async function safeExecute(fn: () => Promise<void>): Promise<void> {
    try {
        await fn();
    } catch (error) {
        console.error('Error executing hook:', error);
        process.exit(1);
    }
}

interface ContentBlock {
    type: string;
    text?: string;
}

interface AssistantEntry {
    type: "assistant";
    message: {
        role: "assistant";
        content: ContentBlock[];
    };
    timestamp: string;
    uuid: string;
}

function getLastAssistantResponse(transcriptPath: string): string | undefined {
    const lines = readFileSync(transcriptPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));

    const lastAssistant = [...lines]
        .reverse()
        .find((entry) => entry.type === "assistant") as AssistantEntry | undefined;

    return lastAssistant?.message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
}


(async () => {
    const isClaudeCode = (process.env.CLAUDE_PLUGIN_ROOT ? true : false);
    const isGeminiCli = (process.env.CLAUDE_PLUGIN_ROOT ? false : true);
    const json = await readJsonStdin<any>();
    const hookName = json.hook_event_name;
    const sidekickDir = getSidekickDir();
    const sessionId = json.session_id;
    const filePath = getVolleyFilePath(sessionId);

    try {
        switch (hookName) {
            case 'SessionStart':
                await safeExecute(async () => {
                    execSync(`code -n ${sidekickDir}`);
                    let timestamp;
                    if (json.timestamp) {
                        let timestamp = new Date(json.timestamp).toLocaleString();
                    }
                    writeFileSync(filePath, `\n\n# Session: ${sessionId} ${timestamp ? '( ' + timestamp + ' )' : ''} \n\n`);
                    execSync(`code ${join(getSidekickDir(), `${sessionId}.md`)}`);
                });
                break;
            case 'BeforeModel':
                await safeExecute(async () => {
                    execSync(`code -n ${sidekickDir}`);
                    if (json.llm_request.messages.at(-1).content !== '') {
                        let timestamp;
                        if (json.timestamp) {
                            let timestamp = new Date(json.timestamp).toLocaleString();
                        }
                        appendFileSync(filePath, `\n\n## Prompt ( Model: ${json.llm_request.model} ) ${timestamp ? '( ' + timestamp + ' )' : ''} \n\n${json.llm_request.messages.at(-1).content}`);
                        appendFileSync(filePath, `\n\n### Response\n\n`);
                    }
                    execSync(`code ${filePath}`);
                });
                break;
            case 'AfterModel':
                {
                    await safeExecute(async () => {
                        execSync(`code -n ${sidekickDir}`);
                        appendFileSync(filePath, `${json.llm_response.text}`);
                    });
                }
                break;
            case 'UserPromptSubmit':
                await safeExecute(async () => {
                    execSync(`code -n ${sidekickDir}`);
                    appendFileSync(filePath, `\n\n## Prompt \n\n${json.prompt}`);
                    appendFileSync(filePath, `\n\n### Response\n\n`);
                    execSync(`code ${filePath}`);
                });
                break;
            case 'Stop':
                await safeExecute(async () => {
                    execSync(`code -n ${sidekickDir}`);
                    const response = getLastAssistantResponse(json.transcript_path);
                    appendFileSync(filePath, `\n\n${response}\n\n`);
                    execSync(`code ${filePath}`);
                });
                break;
            case 'SessionEnd':
                await safeExecute(async () => {
                    if (process.env.GEMINI_SIDEKICK_KEEP_SESSION_FILE === 'true') {
                        return;
                    }
                    if (existsSync(filePath)) {
                        unlinkSync(filePath);
                    }
                });
                break;
            default:
                console.error(`Unknown hook: ${hookName}`);
                process.exit(1);
        }
    } catch (error) {
        console.error('Error executing hook:', error);
        process.exit(1);
    }
})();
