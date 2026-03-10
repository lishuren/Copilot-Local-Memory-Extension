# LogUsage Local Memory Test Guide

This workspace is a focused test harness for the local Copilot memory extension.

It is configured to use the `DemoLogUsage` custom agent together with these local-memory tools:

- `copilotLocalMemory_logInteraction`
- `copilotLocalMemory_queryInteractions`
- `copilotLocalMemory_getRecentInteractions`
- `copilotLocalMemory_summarizeInteractions`
- `copilotLocalMemory_clearInteractions`

## Workspace Purpose

Use this workspace to verify that:

- Copilot interactions are stored locally
- local history can be searched and filtered
- recent interactions can be retrieved
- summary counts can be generated
- local memory can be cleared with simple criteria
- the optional post-log sound hook runs after successful writes

## Optional Metadata Rule

This demo keeps `project_name`, `ticket_id`, and `pull_request_id` in the record model because they improve search and cleanup.

- `project_name` is fixed to `LogUsage` by the demo agent for this workspace
- `ticket_id` and `pull_request_id` should only be included when the prompt actually relates to a ticket or PR
- these fields are metadata for retrieval, not required user settings

## Required Setup

1. Install the local extension: `Shuren-Li.copilot-local-memory-extension`
2. Open this `LogUsage` folder in VS Code
3. Use the `@DemoLogUsage` agent in Copilot Chat

This workspace already includes local-memory settings in `.vscode/settings.json`.

## Current Local Settings

```json
{
  "copilotLocalMemory.enabled": true,
  "copilotLocalMemory.storePrompts": true,
  "copilotLocalMemory.storeResponses": true,
  "copilotLocalMemory.defaultQueryLimit": 20,
  "copilotLocalMemory.enablePostInteractionCommand": true,
  "copilotLocalMemory.postInteractionCommand": "afplay /System/Library/Sounds/Glass.aiff"
}
```

If you set `copilotLocalMemory.enabled` to `false` but leave `copilotLocalMemory.enablePostInteractionCommand=true`, the log tool will skip storage and still run the configured post-interaction command.

## Quick Test Flow

Run the prompts below in order if you want a clean end-to-end verification:

1. Create a few records with normal chat prompts.
2. Search those records by ticket ID or text.
3. Fetch recent interactions.
4. Summarize the stored interactions.
5. Clear a subset of interactions or wipe all data explicitly.

## Copy-Paste Prompt Examples

### 1. Log a basic interaction

```text
@DemoLogUsage Explain how local Copilot memory works in this workspace.
```

```text
@DemoLogUsage Summarize ticket ADO-4321 and suggest next steps.
```

```text
@DemoLogUsage Review pull request 456 and give me a short summary.
```

### 2. Search local history

```text
@DemoLogUsage Search local memory for ADO-4321.
```

```text
@DemoLogUsage Find earlier interactions mentioning payment retries.
```

```text
@DemoLogUsage Query local interactions from today about pull request 456.
```

```text
@DemoLogUsage Search local memory for deployment issues and show matching records.
```

### 3. Retrieve recent interactions

```text
@DemoLogUsage Show the 5 most recent local interactions.
```

```text
@DemoLogUsage Show the 10 most recent local interactions for DemoLogUsage.
```

### 4. Summarize stored data

```text
@DemoLogUsage Summarize local interactions by request type.
```

```text
@DemoLogUsage Show counts of local interactions for the last 7 days.
```

```text
@DemoLogUsage Summarize local memory by model version.
```

```text
@DemoLogUsage Summarize local memory by finish reason.
```

### 5. Retrieve then answer

```text
@DemoLogUsage Search local memory for deployment issues, then tell me the common pattern.
```

```text
@DemoLogUsage Show recent ticket-related interactions and summarize what I was working on.
```

```text
@DemoLogUsage Find the most relevant local interactions about payment retries and suggest the next action.
```

### 6. Clear local memory

```text
@DemoLogUsage Clear local memory for project LogUsage.
```

```text
@DemoLogUsage Delete local interactions before 2026-03-01.
```

```text
@DemoLogUsage Clear all local memory.
```

The clear tool supports these simple criteria:

- `project_name`
- `request_type`
- `before_date`
- `delete_all`

Safety rule:

- It will not delete everything unless `delete_all=true` is set explicitly.

## Expected Behavior

- Each interaction should still be logged after the response is produced.
- Retrieval requests should use the appropriate local-memory tool before the final answer.
- Clear requests should use the clear tool with criteria or an explicit full-wipe confirmation.
- A sound should play after the interaction because `copilotLocalMemory.postInteractionCommand` is configured.

## Related Files

- `.github/agents/DemoLogUsage.agent.md`
- `.github/copilot-instruction.md`
- `.vscode/settings.json`
