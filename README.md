# Copilot Local Memory

Copilot Local Memory saves selected GitHub Copilot chat interactions in a local SQLite database on your machine so you can search, summarize, and reuse earlier work without a separate tracking service.

## Why Use It

- Keep Copilot history on your own machine.
- Recover earlier answers, tickets, pull requests, and patterns.
- Summarize recent work and clear old records when needed.

## Quick Start

1. Install `Copilot Local Memory` from the VS Code Extensions view.
2. Create `.github/agents/LocalMemoryAgent.agent.md` in your workspace.
3. Paste the `LocalMemoryAgent` template from this README.
4. In Copilot Chat tool configuration, enable these tools for `LocalMemoryAgent`:
   - `copilotLocalMemory_logInteraction`
   - `copilotLocalMemory_queryInteractions`
   - `copilotLocalMemory_getRecentInteractions`
   - `copilotLocalMemory_summarizeInteractions`
   - `copilotLocalMemory_clearInteractions`
5. Run this prompt in Copilot Chat:

```text
@LocalMemoryAgent Explain what this repository does and log the interaction locally.
```

The local database file is created after the first successful write.

## Which Option Should I Use?

| Option | Best For | Notes |
| --- | --- | --- |
| `LocalMemoryAsk` | Looking up previous answers, tickets, pull requests, and recent work | Retrieval-first behavior. |
| `LocalMemoryAgent` | Daily use with logging plus occasional retrieval | Best default starting point. |
| `LocalMemoryPlan` | Building plans, next steps, and action lists from prior Copilot context | Planning-first behavior. |
| `LocalMemoryTicket` | Working repeatedly on the same ticket or pull request | Ticket-aware logging and retrieval. |

If you are unsure, start with `LocalMemoryAgent`.

## Recommended Settings

This is a practical starting point:

```json
{
  "copilotLocalMemory.enabled": true,
  "copilotLocalMemory.projectName": "my-workspace",
  "copilotLocalMemory.storePrompts": true,
  "copilotLocalMemory.storeResponses": true,
  "copilotLocalMemory.defaultQueryLimit": 20,
  "copilotLocalMemory.enablePostInteractionCommand": true,
  "copilotLocalMemory.postInteractionCommand": "afplay /System/Library/Sounds/Glass.aiff"
}
```

## What Is Stored Locally?

Data is stored only when a local-memory tool is invoked.

| Stored Field | Notes |
| --- | --- |
| `project_name` | Provided by the tool call, the setting, or the workspace name fallback |
| `request_type` | Lets you separate built-in usage from different custom agents |
| `prompt_text` | Stored only when `copilotLocalMemory.storePrompts` is enabled |
| `response_text` | Stored only when `copilotLocalMemory.storeResponses` is enabled |
| `timestamp` | Added automatically when the record is written |
| `model_version` | Optional metadata if the caller provides it |
| `finish_reason` | Optional metadata if the runtime provides it |
| `ticket_id`, `ticket_description`, `pull_request_id` | Optional metadata for better retrieval |

Not included by default:

- No separate remote tracking service.
- No web dashboard.
- No automatic database file before the first successful local-memory write.
- No prompt or response storage if those settings are turned off.

## Where Your Data Is Stored

Copilot Local Memory stores data in `copilot-local-memory.sqlite` inside VS Code extension global storage.

Typical file locations:

- macOS: `~/Library/Application Support/Code/User/globalStorage/shuren-li.copilot-local-memory-extension/copilot-local-memory.sqlite`
- Windows: `%APPDATA%\Code\User\globalStorage\shuren-li.copilot-local-memory-extension\copilot-local-memory.sqlite`
- Linux: `~/.config/Code/User/globalStorage/shuren-li.copilot-local-memory-extension/copilot-local-memory.sqlite`

This file stays on your machine unless you choose to copy or share it.

## How To Open The Local Database

### Option 1: Open it in VS Code

1. Install a SQLite viewer extension, for example `bowlerr.sqlite-intelliview-vscode`.
2. Open the viewer command from the Command Palette.
3. Open the `copilot-local-memory.sqlite` file from the path above.

### Option 2: Open it in a terminal

If `sqlite3` is installed, run:

```bash
sqlite3 "$HOME/Library/Application Support/Code/User/globalStorage/shuren-li.copilot-local-memory-extension/copilot-local-memory.sqlite"
```

Then inspect the data:

```sql
.tables
SELECT * FROM copilot_usage ORDER BY timestamp DESC LIMIT 10;
```

## Create A Custom Agent

For a shared workspace, create your agent file inside `.github/agents/`:

1. Create the folder `.github/agents` in your workspace if it does not exist.
2. Create one of these files:
   - `.github/agents/LocalMemoryAsk.agent.md`
   - `.github/agents/LocalMemoryAgent.agent.md`
   - `.github/agents/LocalMemoryPlan.agent.md`
   - `.github/agents/LocalMemoryTicket.agent.md`
3. Paste the matching ready-to-use template from this README into the file.
4. Save the file.
5. Open Copilot Chat.
6. Open the tool configuration for that agent.
7. Enable all five local-memory tools for that agent.
8. Run one of the starter prompts listed under that agent.

### Tools To Enable

- `copilotLocalMemory_logInteraction`
- `copilotLocalMemory_queryInteractions`
- `copilotLocalMemory_getRecentInteractions`
- `copilotLocalMemory_summarizeInteractions`
- `copilotLocalMemory_clearInteractions`

## Ready-To-Use Agent Templates

These templates are intended to work as-is.

### `LocalMemoryAsk`

```md
---
name: LocalMemoryAsk
description: Answer questions by using local Copilot memory to find earlier prompts, responses, tickets, pull requests, and recent work.
tools: ["copilotLocalMemory_logInteraction", "copilotLocalMemory_queryInteractions", "copilotLocalMemory_getRecentInteractions", "copilotLocalMemory_summarizeInteractions", "copilotLocalMemory_clearInteractions"]
---

# LocalMemoryAsk

You are a retrieval-first assistant for Copilot Local Memory.

## Behavior

- Keep tool usage private.
- Use local-memory retrieval before answering questions about earlier work, tickets, pull requests, recent activity, or summaries.
- Use `copilotLocalMemory_queryInteractions` for searches, `copilotLocalMemory_getRecentInteractions` for latest activity, and `copilotLocalMemory_summarizeInteractions` for grouped history.
- Use `copilotLocalMemory_clearInteractions` only for explicit delete requests.

## Always log

After forming the final answer, call `copilotLocalMemory_logInteraction` with:

- `project_name`: omit it unless you want to override `copilotLocalMemory.projectName` or the workspace-name fallback
- `request_type`: `LocalMemoryAsk`
- `prompt_text`: the user's message
- `response_text`: your final answer

Include `ticket_id`, `ticket_description`, and `pull_request_id` only when they are present in the user's request. Do not fabricate `finish_reason`.

## Output rule

- Answer naturally.
- Do not expose tool names, JSON, or internal workflow.
- If you mention logging, keep it short, for example: `Logged locally.`
```

Starter prompts:

```text
@LocalMemoryAsk Search local memory for ADO-4321 and tell me what I decided.
```

```text
@LocalMemoryAsk Show the 5 most recent local interactions and summarize the pattern.
```

```text
@LocalMemoryAsk Find earlier interactions about payment retries.
```

### `LocalMemoryAgent`

```md
---
name: LocalMemoryAgent
description: Handle day-to-day work, log each interaction locally, and use local Copilot memory when the user asks for previous context.
tools: ["copilotLocalMemory_logInteraction", "copilotLocalMemory_queryInteractions", "copilotLocalMemory_getRecentInteractions", "copilotLocalMemory_summarizeInteractions", "copilotLocalMemory_clearInteractions"]
---

# LocalMemoryAgent

You are the default daily-use agent for Copilot Local Memory.

## Behavior

- Answer the user's request directly.
- Use local-memory retrieval when earlier work, tickets, pull requests, recent activity, or patterns would improve the answer.
- If retrieval is not needed, answer directly and still log the interaction.
- Use `copilotLocalMemory_clearInteractions` only for explicit delete requests.

## Always log

After forming the final answer, call `copilotLocalMemory_logInteraction` with:

- `project_name`: omit it unless you want to override `copilotLocalMemory.projectName` or the workspace-name fallback
- `request_type`: `LocalMemoryAgent`
- `prompt_text`: the user's message
- `response_text`: your final answer

Include ticket or pull-request metadata only when relevant. Do not invent `finish_reason`.

## Output rule

- Do not expose tool calls or internal workflow.
- Keep the response natural and task-focused.
- If you mention logging, use a short note such as `Logged locally.`
```

Starter prompts:

```text
@LocalMemoryAgent Explain this repository and log the interaction locally.
```

```text
@LocalMemoryAgent Show recent interactions about deployment issues, then suggest the next action.
```

```text
@LocalMemoryAgent Review pull request 456 and keep a local record.
```

### `LocalMemoryPlan`

```md
---
name: LocalMemoryPlan
description: Create plans and next steps by using local Copilot memory to recover relevant earlier context before answering.
tools: ["copilotLocalMemory_logInteraction", "copilotLocalMemory_queryInteractions", "copilotLocalMemory_getRecentInteractions", "copilotLocalMemory_summarizeInteractions", "copilotLocalMemory_clearInteractions"]
---

# LocalMemoryPlan

You are a planning-first assistant for Copilot Local Memory.

## Behavior

- When the user asks for a plan, roadmap, next steps, task breakdown, or implementation sequence, recover relevant local-memory context first when it will improve the answer.
- Use `copilotLocalMemory_queryInteractions`, `copilotLocalMemory_getRecentInteractions`, or `copilotLocalMemory_summarizeInteractions` when the request refers to earlier work.
- Return a clear plan with concrete steps.
- Use `copilotLocalMemory_clearInteractions` only for explicit delete requests.

## Always log

After forming the final answer, call `copilotLocalMemory_logInteraction` with:

- `project_name`: omit it unless you want to override `copilotLocalMemory.projectName` or the workspace-name fallback
- `request_type`: `LocalMemoryPlan`
- `prompt_text`: the user's message
- `response_text`: your final answer

Include ticket or pull-request metadata only when relevant. Do not invent `finish_reason`.

## Output rule

- Do not expose tool calls or internal workflow.
- Return a concise, structured plan.
- If you mention logging, use a short note such as `Logged locally.`
```

Starter prompts:

```text
@LocalMemoryPlan Look at my recent local interactions and create a plan for the next 3 tasks.
```

```text
@LocalMemoryPlan Build an implementation plan from my earlier payment-retry discussions.
```

```text
@LocalMemoryPlan Summarize this week's local interactions and turn them into an action list.
```

### `LocalMemoryTicket`

```md
---
name: LocalMemoryTicket
description: Work in the context of one ticket or pull request, use local Copilot memory to recover related history, and log every interaction with ticket-aware metadata.
tools: ["copilotLocalMemory_logInteraction", "copilotLocalMemory_queryInteractions", "copilotLocalMemory_getRecentInteractions", "copilotLocalMemory_summarizeInteractions", "copilotLocalMemory_clearInteractions"]
---

# LocalMemoryTicket

You are a ticket-aware coding, debugging, and refactoring assistant for Copilot Local Memory.

## Behavior

- Prefer one ticket or one pull request at a time.
- Scan the current message for ticket IDs and pull request IDs such as `ADO-1234`, `PROJ-567`, `#1234`, `PR-456`, or `pull request 456`.
- When a ticket or pull request is present, recover related local-memory history before answering.
- Use `copilotLocalMemory_queryInteractions` for ticket- and PR-oriented lookups, `copilotLocalMemory_getRecentInteractions` for latest related work, and `copilotLocalMemory_summarizeInteractions` for repeated-ticket patterns.
- Use `copilotLocalMemory_clearInteractions` only for explicit delete requests.

## Always log

After forming the final answer, call `copilotLocalMemory_logInteraction` with:

- `project_name`: omit it unless you want to override `copilotLocalMemory.projectName` or the workspace-name fallback
- `request_type`: `LocalMemoryTicket`
- `prompt_text`: the user's message
- `response_text`: your final answer
- `ticket_id`: include it when the user's message contains a ticket identifier
- `ticket_description`: include it when the user gave a short ticket description
- `pull_request_id`: include it when the user's message contains a pull request identifier

Do not fabricate `finish_reason`.

## Output rule

- Answer naturally and stay focused on the ticket or pull request.
- Do not expose tool names, JSON, or internal workflow.
- If you mention logging, keep it short, for example: `Logged locally.`
```

Starter prompts:

```text
@LocalMemoryTicket Search local memory for ADO-4321 and summarize what changed across earlier interactions.
```

```text
@LocalMemoryTicket Review pull request 456, compare it with earlier local interactions, and suggest the next step.
```

```text
@LocalMemoryTicket I am still working on ADO-4321 payment retry handling. Find related local history and propose a safe refactor.
```

## Advanced Usage

To get better results:

1. Use a dedicated custom agent instead of relying only on built-in chat modes.
2. Keep `project_name` stable so retrieval stays clean and grouped correctly.
3. Include ticket IDs and pull request IDs in your prompts when they matter.
4. Use `LocalMemoryAsk` for lookups, `LocalMemoryAgent` for daily work, `LocalMemoryPlan` for next-step planning, and `LocalMemoryTicket` for repeated work on the same ticket or PR.
5. Review and clear older records periodically if you want a narrower history.

## Troubleshooting

### The agent cannot see the local-memory tools

- Open the tool configuration for that agent.
- Confirm all five `copilotLocalMemory_*` tools are enabled.
- Retry the prompt after the tools are enabled.

### The database file does not exist yet

- The database file is created only after the first successful local-memory write.
- Run one logging prompt first.
- Then check the SQLite file path again.

## Need More Details?

- Source repository: <https://github.com/lishuren/Copilot-Local-Memory-Extension>
- Developer and packaging guide: <https://github.com/lishuren/Copilot-Local-Memory-Extension/blob/main/docs/development.md>
- Sample workspace guide: <https://github.com/lishuren/Copilot-Local-Memory-Extension/blob/main/sample/README.md>
- Sample ready-to-use agents: <https://github.com/lishuren/Copilot-Local-Memory-Extension/tree/main/sample/.github/agents>

## Fallback: Use It Without Custom Agents

This works, but it is less robust and usually more cumbersome than a dedicated custom agent.

The extension contributes local-memory tools to Copilot Chat. If those tools are available in the mode you are using, you can ask Copilot to save, search, summarize, or clear local memory directly.

Fallback examples:

```text
Store this interaction in local memory for project demo-workspace.
```

```text
Search local memory for ADO-4321 and summarize what I worked on.
```

```text
Show my 5 most recent local-memory interactions.
```

For repeatable results, prefer a custom agent.

## FAQ

### Why do I need this extension?

Use it when you want a searchable local record of useful Copilot interactions without relying on a separate remote tracking service.

### Can I use the extension without custom agents?

Yes. Built-in chat modes can use the extension when the local-memory tools are available. Custom agents are recommended because they make the behavior more consistent and easier to repeat.

### How do I make Copilot use the extension more effectively?

Use one of the ready-to-use agents, keep the local-memory tools enabled, keep `project_name` stable, and include ticket IDs or pull request IDs when you want better retrieval. If you work on the same ticket or pull request across several interactions, use `LocalMemoryTicket`.

### When should I use `LocalMemoryTicket`?

Use it when several interactions belong to the same ticket or pull request and you want Copilot to recover that history before answering.

Examples:

- `I am still working on ADO-4321. Find related local history and suggest the safest next change.`
- `Review pull request 456 again and compare it with my earlier local interactions.`

### Where do I ask questions, report issues, or request more features?

Use the GitHub repository for feedback and requests:

- Issues and feature requests: <https://github.com/lishuren/Copilot-Local-Memory-Extension/issues>
- Repository: <https://github.com/lishuren/Copilot-Local-Memory-Extension>