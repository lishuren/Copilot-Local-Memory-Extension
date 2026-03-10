# Copilot Local Memory

Copilot Local Memory is a VS Code extension that stores Copilot chat interactions in local extension storage instead of sending them to a remote tracking service.

## Features

- Log interactions locally with `copilotLocalMemory_logInteraction`
- Query or search prior interactions with `copilotLocalMemory_queryInteractions`
- Fetch recent interactions with `copilotLocalMemory_getRecentInteractions`
- Summarize local interaction history with `copilotLocalMemory_summarizeInteractions`
- Clear local interaction history with `copilotLocalMemory_clearInteractions`

## Optional Metadata

The local memory model keeps `project_name`, `ticket_id`, and `pull_request_id` because they improve retrieval and cleanup, but they are optional metadata:

- `project_name` can come from the agent payload or workspace fallback
- `ticket_id` should be stored only when a ticket is actually present
- `pull_request_id` should be stored only when a PR is actually present

Blank values are ignored instead of being stored.

## Settings

- `copilotLocalMemory.enabled`
- `copilotLocalMemory.projectName`
- `copilotLocalMemory.storePrompts`
- `copilotLocalMemory.storeResponses`
- `copilotLocalMemory.defaultQueryLimit`
- `copilotLocalMemory.postInteractionCommand`
- `copilotLocalMemory.enablePostInteractionCommand`

## Post-Interaction Command

If you want a local notification after each interaction, set `copilotLocalMemory.postInteractionCommand`.

Example on macOS:

```json
{
	"copilotLocalMemory.postInteractionCommand": "afplay /System/Library/Sounds/Glass.aiff"
}
```

The hook is controlled separately by `copilotLocalMemory.enablePostInteractionCommand`.

If `copilotLocalMemory.enabled` is `false` but `copilotLocalMemory.enablePostInteractionCommand` is `true`, the extension skips local storage and still runs the configured post-interaction command when the log tool is invoked.

## Clear Local Memory

Use `copilotLocalMemory_clearInteractions` to delete stored local history.

Supported criteria:

- `project_name`
- `request_type`
- `before_date`
- `delete_all`

Safety rule:

- You must provide at least one criterion, or explicitly set `delete_all` to `true`.

Examples:

```json
{
	"project_name": "LogUsage"
}
```

```json
{
	"request_type": "DemoLogUsage",
	"before_date": "2026-03-01T00:00:00Z"
}
```

```json
{
	"delete_all": true
}
```