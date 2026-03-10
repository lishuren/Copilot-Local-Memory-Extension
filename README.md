# Copilot Local Memory

Copilot Local Memory is a VS Code extension that stores Copilot chat interactions in local extension storage instead of sending them to a remote tracking service.

## Install In VS Code

### Option 1: Install the published extension

1. Open the Extensions view in VS Code.
2. Search for `Copilot Local Memory`.
3. Install `Shuren-Li.copilot-local-memory-extension`.

### Option 2: Install from this source repository

1. Clone this repository and open it in VS Code.
2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build
```

4. Package the extension into a VSIX:

```bash
npm run package
```

5. Install the generated `.vsix` file using either:

- `Extensions: Install from VSIX...` from the Command Palette
- `code --install-extension copilot-local-memory-extension-<version>.vsix`

### Option 3: Run it in an Extension Development Host

Use this if you are developing or testing the extension locally.

1. Open this repository in VS Code.
2. Run:

```bash
npm install
npm run build
```

3. Press `F5` in VS Code.
4. In the new Extension Development Host window, open the `sample` folder from this repository in a separate workspace window.
5. In that sample window, open Copilot Chat and test the tools there.

### Recommended local test flow

The easiest way to test the extension is to use two VS Code windows:

1. Window 1: open this extension repository and press `F5` to launch the Extension Development Host.
2. Window 2: inside the Extension Development Host, open the `sample` folder from this repository.
3. Use the sample workspace as the test harness for local-memory logging, querying, summarizing, and clearing.

The sample workspace has its own guide at `sample/README.md` and is intended to be the main place to validate the extension behavior.

## Setup

After installation, configure the extension in your VS Code settings if you want to override the defaults.

Example:

```json
{
	"copilotLocalMemory.enabled": true,
	"copilotLocalMemory.projectName": "my-workspace",
	"copilotLocalMemory.storePrompts": true,
	"copilotLocalMemory.storeResponses": true,
	"copilotLocalMemory.defaultQueryLimit": 20,
	"copilotLocalMemory.enablePostInteractionCommand": true,
	"copilotLocalMemory.postInteractionCommand": "say Mission accomplished. Victory lap canceled. Back to work."
}
```

These tools are exposed as VS Code language model tools. They are intended to be called by Copilot, a custom agent, or prompt instructions that reference the tool names.

If you are using a custom agent, the tools must also be enabled for that agent in the agent tool picker. If the local-memory tools are not enabled there, the agent cannot call them even if this extension is installed and activated.

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

`finish_reason` is also supported by the storage model, but it is only stored when the tool caller explicitly provides it. In VS Code custom-agent flows, the actual model finish reason is typically not exposed automatically to the agent tool call, so seeing an empty `finish_reason` column is expected unless another caller injects that value.

## Settings

- `copilotLocalMemory.enabled`
- `copilotLocalMemory.projectName`
- `copilotLocalMemory.storePrompts`
- `copilotLocalMemory.storeResponses`
- `copilotLocalMemory.defaultQueryLimit`
- `copilotLocalMemory.postInteractionCommand`
- `copilotLocalMemory.enablePostInteractionCommand`

## Example Usage

The examples below show the expected tool inputs and the result shape returned by the extension.

### 1. Log an interaction

Tool: `copilotLocalMemory_logInteraction`

Example input:

```json
{
	"request_type": "Requirement",
	"prompt_text": "Summarize ticket ADO-4321 and suggest next steps.",
	"response_text": "The ticket is about retry logic in the payment worker.",
	"model_version": "gpt-5.4",
	"finish_reason": "stop",
	"ticket_id": "ADO-4321",
	"ticket_description": "Payment worker retry issue",
	"project_name": "billing-service"
}
```

Typical result:

```json
{
	"success": true,
	"message": "Interaction stored locally.",
	"record": {
		"id": 1,
		"project_name": "billing-service",
		"request_type": "Requirement",
		"prompt_text": "Summarize ticket ADO-4321 and suggest next steps.",
		"response_text": "The ticket is about retry logic in the payment worker.",
		"model_version": "gpt-5.4",
		"finish_reason": "stop",
		"ticket_id": "ADO-4321",
		"ticket_description": "Payment worker retry issue",
		"timestamp": "2026-03-10T12:00:00.000Z"
	},
	"stored": true,
	"post_interaction_command_executed": false
}
```

### 2. Query interactions

Tool: `copilotLocalMemory_queryInteractions`

Example input:

```json
{
	"search_text": "payment retry",
	"project_name": "billing-service",
	"request_type": "Requirement",
	"start_date": "2026-03-01T00:00:00Z",
	"end_date": "2026-03-31T23:59:59Z",
	"limit": 10
}
```

Typical result:

```json
{
	"success": true,
	"count": 1,
	"records": [
		{
			"id": 1,
			"project_name": "billing-service",
			"request_type": "Requirement",
			"prompt_text": "Summarize ticket ADO-4321 and suggest next steps.",
			"response_text": "The ticket is about retry logic in the payment worker.",
			"model_version": "gpt-5.4",
			"finish_reason": "stop",
			"ticket_id": "ADO-4321",
			"ticket_description": "Payment worker retry issue",
			"pull_request_id": null,
			"timestamp": "2026-03-10T12:00:00.000Z"
		}
	]
}
```

### 3. Get recent interactions

Tool: `copilotLocalMemory_getRecentInteractions`

Example input:

```json
{
	"project_name": "billing-service",
	"limit": 5
}
```

Typical result:

```json
{
	"success": true,
	"count": 5,
	"records": [
		{
			"id": 8,
			"project_name": "billing-service",
			"request_type": "Requirement",
			"timestamp": "2026-03-10T15:17:41.000Z"
		}
	]
}
```

### 4. Summarize interactions

Tool: `copilotLocalMemory_summarizeInteractions`

Example input:

```json
{
	"project_name": "billing-service",
	"start_date": "2026-03-01T00:00:00Z",
	"end_date": "2026-03-31T23:59:59Z",
	"group_by": "request_type",
	"limit": 10
}
```

Typical result:

```json
{
	"success": true,
	"total_count": 18,
	"grouped_by": "request_type",
	"grouped_counts": [
		{
			"key": "Requirement",
			"count": 9
		},
		{
			"key": "CodeReview",
			"count": 6
		},
		{
			"key": "BugFix",
			"count": 3
		}
	]
}
```

Valid `group_by` values are:

- `request_type`
- `project_name`
- `model_version`
- `finish_reason`

### 5. Clear interactions

Tool: `copilotLocalMemory_clearInteractions`

Example input using criteria:

```json
{
	"project_name": "billing-service",
	"before_date": "2026-03-01T00:00:00Z"
}
```

Typical result:

```json
{
	"success": true,
	"message": "Local interactions deleted.",
	"deleted_count": 4,
	"delete_all": false,
	"criteria": {
		"project_name": "billing-service",
		"before_date": "2026-03-01T00:00:00Z"
	}
}
```

Example input to clear everything:

```json
{
	"delete_all": true
}
```

### Example prompts for a custom agent

If you have a custom Copilot agent wired to these tools, prompts can be as simple as:

- `Store this interaction in local memory for billing-service.`
- `Search local memory for ADO-4321.`
- `Show the 5 most recent local interactions for billing-service.`
- `Summarize local interactions by model version.`
- `Clear local memory before 2026-03-01 for billing-service.`

## Post-Interaction Command

If you want a local notification after each interaction, set `copilotLocalMemory.postInteractionCommand`.

Example on macOS using the system voice:

```json
{
	"copilotLocalMemory.postInteractionCommand": "say Mission accomplished. Victory lap canceled. Back to work."
}
```

Another macOS example using a sound effect:

```json
{
	"copilotLocalMemory.postInteractionCommand": "afplay /System/Library/Sounds/Glass.aiff"
}
```

The hook is controlled separately by `copilotLocalMemory.enablePostInteractionCommand`.

If `copilotLocalMemory.enabled` is `false` but `copilotLocalMemory.enablePostInteractionCommand` is `true`, the extension skips local storage and still runs the configured post-interaction command when the log tool is invoked.

## Inspect The SQLite Database

The extension stores data in a local SQLite file named `copilot-local-memory.sqlite`.

On macOS, the file is typically located under VS Code global storage:

```text
~/Library/Application Support/Code/User/globalStorage/shuren-li.copilot-local-memory-extension/copilot-local-memory.sqlite
```

If you are using VS Code Insiders, the base path is usually:

```text
~/Library/Application Support/Code - Insiders/User/globalStorage/shuren-li.copilot-local-memory-extension/copilot-local-memory.sqlite
```

If you are not sure where the file is, run:

```bash
find ~/Library/Application\ Support -name copilot-local-memory.sqlite 2>/dev/null
```

### Open it in VS Code

Recommended extension:

```vscode-extensions
bowlerr.sqlite-intelliview-vscode
```

After installing a SQLite viewer extension:

1. Open the Command Palette.
2. Run the extension's database open command.
3. When the macOS file picker opens, press `Cmd+Shift+G` to open the "Go to the folder" input.
4. Paste the full database path:

```text
/Users/sli3/Library/Application Support/Code/User/globalStorage/shuren-li.copilot-local-memory-extension/copilot-local-memory.sqlite
```

5. Press `Enter` and open the file.
6. Browse the `copilot_usage` table.

If you prefer to open the folder first, use:

```text
/Users/sli3/Library/Application Support/Code/User/globalStorage/shuren-li.copilot-local-memory-extension/
```

### Open it in the VS Code terminal

If you have the SQLite CLI installed, you can inspect the DB directly from the integrated terminal:

```bash
sqlite3 "~/Library/Application Support/Code/User/globalStorage/shuren-li.copilot-local-memory-extension/copilot-local-memory.sqlite"
```

Then run:

```sql
.tables
SELECT * FROM copilot_usage LIMIT 10;
```

### Troubleshooting

If the file does not open, check these common cases first.

#### 1. The shell path fails because of spaces

This will fail on macOS because `Application Support` contains a space:

```bash
ls /Users/sli3/Library/Application Support/Code/User/globalStorage/shuren-li.copilot-local-memory-extension/
```

Use either quotes:

```bash
ls "/Users/sli3/Library/Application Support/Code/User/globalStorage/shuren-li.copilot-local-memory-extension/"
```

Or escaped spaces:

```bash
ls /Users/sli3/Library/Application\ Support/Code/User/globalStorage/shuren-li.copilot-local-memory-extension/
```

#### 2. The database file does not exist yet

The SQLite file is only created after the extension initializes and successfully writes local memory.

If this returns nothing:

```bash
find "$HOME/Library/Application Support/Code/User/globalStorage" -name "copilot-local-memory.sqlite"
```

then the database has not been created in the current VS Code profile yet.

#### 3. The chat session says local-memory logging is unavailable

If Copilot responds with a message like `Local-memory logging unavailable in this session`, the local-memory tool was not available in that window or session, so no database write happened.

The most reliable local test flow is:

1. Open this extension repository in VS Code.
2. Run `npm install` and `npm run build` if needed.
3. Press `F5` to start the Extension Development Host.
4. In the new host window, open the `sample` folder from this repository.
5. Use Copilot Chat in that sample workspace to trigger the local-memory tools.
6. Check again for `copilot-local-memory.sqlite` after the interaction completes.

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