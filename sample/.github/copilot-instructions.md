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

If an agent cannot use local memory, check the tool configuration first.

If the editor reports `Unknown tool` for these agent files, install or run the extension first so the local-memory tools are available in the active session.