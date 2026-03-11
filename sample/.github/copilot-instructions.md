---
name: Local Memory Sample Workspace
---

# Copilot Instructions For The Local Memory Sample Workspace

This sample workspace contains four ready-to-use agents for testing Copilot Local Memory:

- `LocalMemoryAsk`
- `LocalMemoryAgent`
- `LocalMemoryPlan`
- `LocalMemoryTicket`

All three agents depend on these tools being enabled in their agent tool configuration:

- `copilotLocalMemory_logInteraction`
- `copilotLocalMemory_queryInteractions`
- `copilotLocalMemory_getRecentInteractions`
- `copilotLocalMemory_summarizeInteractions`
- `copilotLocalMemory_clearInteractions`

This workspace uses `LogUsage` as the fixed project name for easier testing and retrieval.

For retrieval prompts such as "show recent interactions" or "summarize recent work", agents should not filter by `request_type` unless the user explicitly asks for one agent's history.

The current interaction is logged only after the final answer is formed, so the same turn will not appear in its own retrieval results.

Workspace setting changes should apply on the next tool invocation. Agent-file changes or tool-selection changes may require a new chat or a window reload if Copilot keeps stale tool state.

If an agent cannot use local memory, check the tool configuration first.

If the editor reports `Unknown tool` for these agent files, install or run the extension first so the local-memory tools are available in the active session.