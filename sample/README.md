# Local Memory Sample Workspace

This sample workspace is a ready-to-run test harness for Copilot Local Memory.

It includes four custom agents that match the templates documented in the root README:

- `LocalMemoryAsk`
- `LocalMemoryAgent`
- `LocalMemoryPlan`
- `LocalMemoryTicket`

All three agents use the same local-memory tools:

- `copilotLocalMemory_logInteraction`
- `copilotLocalMemory_queryInteractions`
- `copilotLocalMemory_getRecentInteractions`
- `copilotLocalMemory_summarizeInteractions`
- `copilotLocalMemory_clearInteractions`

## What This Sample Is For

Use this workspace to verify that:

- Copilot interactions are stored locally.
- Local history can be searched and filtered.
- Recent interactions can be retrieved.
- Summary counts can be generated.
- Local memory can be cleared with explicit criteria.
- The optional post-interaction command can run after successful writes.

## Included Agents

| Agent | Best For |
| --- | --- |
| `LocalMemoryAsk` | Retrieval-first questions about earlier work, tickets, pull requests, and summaries |
| `LocalMemoryAgent` | Default daily usage with logging plus optional retrieval |
| `LocalMemoryPlan` | Plans, next steps, task breakdowns, and action lists based on prior context |
| `LocalMemoryTicket` | Repeated work on the same ticket or pull request with ticket-aware retrieval |

## Required Setup

1. Install `Shuren-Li.copilot-local-memory-extension`.
2. Open this `sample` folder in VS Code.
3. Open Copilot Chat.
4. Enable the five local-memory tools for each of these agents:
   - `LocalMemoryAsk`
   - `LocalMemoryAgent`
   - `LocalMemoryPlan`
  - `LocalMemoryTicket`
5. Run one of the prompts below.

This workspace already includes local-memory settings in `.vscode/settings.json`.

If the editor shows `Unknown tool` warnings in the sample agent files, install or run the extension first. Those agents are meant to be used with Copilot Local Memory available in the active VS Code session.

## Workspace Settings

```json
{
  "copilotLocalMemory.enabled": true,
  "copilotLocalMemory.projectName": "LogUsage",
  "copilotLocalMemory.storePrompts": true,
  "copilotLocalMemory.storeResponses": true,
  "copilotLocalMemory.defaultQueryLimit": 20,
  "copilotLocalMemory.enablePostInteractionCommand": true,
  "copilotLocalMemory.postInteractionCommand": "afplay /System/Library/Sounds/Glass.aiff"
}
```

The post-interaction command is a general completion hook. It can run any shell command after the interaction is done, and playing a sound is just one practical example for long-running Copilot tasks.

Windows example:

```json
"copilotLocalMemory.postInteractionCommand": "powershell -Command \"(New-Object System.Media.SoundPlayer 'C:\\Windows\\Media\\Alarm01.wav').PlaySync()\""
```

If the configured command fails, the interaction still completes. The error is logged to the `Copilot Local Memory` output channel.

## Quick Test Flow

1. Log a normal interaction.
2. Retrieve an earlier interaction.
3. Summarize a group of interactions.
4. Create a plan from stored context.
5. Clear some records with explicit criteria.

## Two-Prompt Smoke Test

Use these two prompts in order:

```text
@LocalMemoryAgent Explain what this sample workspace does and log the interaction locally.
```

```text
@LocalMemoryAsk Show the 5 most recent local interactions and summarize the pattern.
```

Expected result:

- The first prompt writes one local-memory record.
- The second prompt can retrieve that earlier record because it is now part of local history.

## Ready-To-Use Prompts

### `LocalMemoryAsk`

```text
@LocalMemoryAsk Search local memory for ADO-4321 and tell me what I decided.
```

```text
@LocalMemoryAsk Show the 5 most recent local interactions and summarize the pattern.
```

```text
@LocalMemoryAsk Find earlier interactions mentioning deployment issues.
```

### `LocalMemoryAgent`

```text
@LocalMemoryAgent Explain how this sample workspace uses local memory and log the interaction locally.
```

```text
@LocalMemoryAgent Review pull request 456 and keep a local record.
```

```text
@LocalMemoryAgent Show recent interactions about payment retries, then suggest the next action.
```

### `LocalMemoryPlan`

```text
@LocalMemoryPlan Look at my recent local interactions and create a plan for the next 3 tasks.
```

```text
@LocalMemoryPlan Build an implementation plan from my earlier deployment discussions.
```

```text
@LocalMemoryPlan Summarize this week's local interactions and turn them into an action list.
```

### `LocalMemoryTicket`

```text
@LocalMemoryTicket Search local memory for ADO-4321 and summarize what changed across earlier interactions.
```

```text
@LocalMemoryTicket Review pull request 456, compare it with earlier local interactions, and suggest the next step.
```

```text
@LocalMemoryTicket I am still working on ADO-4321 payment retry handling. Find related local history and propose a safe refactor.
```

## Clear Local Memory

All included agents can clear local memory when you ask explicitly.

```text
@LocalMemoryAsk Clear local memory for project LogUsage.
```

```text
@LocalMemoryAgent Delete local interactions before 2026-03-01.
```

```text
@LocalMemoryPlan Clear all local memory.
```

The clear tool supports these criteria:

- `project_name`
- `request_type`
- `before_date`
- `delete_all`

## Expected Behavior

- The final answer should be shown in natural language.
- The interaction should be logged after the answer is formed.
- Retrieval requests should use the relevant local-memory tool before the final answer.
- A retrieval request for "recent interactions" should search across local history and should not be scoped to one `request_type` unless the user asked for that narrower view.
- The current turn will not appear in "recent" results until the next interaction, because logging happens after the answer is formed.
- A sound can play after the interaction because `copilotLocalMemory.postInteractionCommand` is configured.

## Troubleshooting

### Do I need to reload VS Code after changes?

- Changing `copilotLocalMemory.*` settings in `.vscode/settings.json` should not require a reload. The extension reads the current workspace configuration each time a local-memory tool is invoked.
- Changing agent files or enabling tools from Copilot Chat tool selection can take effect only for a fresh chat context. In practice, reopening the chat view or starting a new chat is often enough.
- If Copilot still behaves as if the old tool configuration is cached, reload the VS Code window. Fully closing and reopening VS Code is the fallback if the chat session remains stale.

### The agent does not use local memory

- Confirm the local-memory tools are enabled for that specific agent.
- Retry with one of the exact prompts from this file.
- If the editor reports `Unknown tool`, make sure the extension is installed or running in an Extension Development Host.
- If you just enabled the tools or edited an agent file, start a new chat first. If that does not help, reload the VS Code window.

### The agent says there are no recent interactions even though rows exist

- Check whether the agent retrieved history before logging the current turn. That is expected behavior.
- Check whether the agent accidentally filtered retrieval by `request_type` such as `LocalMemoryAsk`. A general "recent interactions" request should usually omit that filter.
- If you want one combined history for the workspace, rely on `copilotLocalMemory.projectName` in `.vscode/settings.json` and avoid overriding `project_name` differently in each agent.

### Copilot keeps using `file.bin` as the reference

- `sample/.github/agents/file.bin` is not part of the intended sample workspace. If it appears, delete it and start a new chat.
- If the file was open in an editor tab, close that tab before retrying so Copilot does not keep using it as active context.

### The SQLite file does not exist yet

- Run a logging prompt first.
- Then check the file path again from the root README.

## Related Files

- `.github/agents/LocalMemoryAsk.agent.md`
- `.github/agents/LocalMemoryAgent.agent.md`
- `.github/agents/LocalMemoryPlan.agent.md`
- `.github/agents/LocalMemoryTicket.agent.md`
- `.github/copilot-instructions.md`
- `.vscode/settings.json`