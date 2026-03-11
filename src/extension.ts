import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { error, info } from './logger';
import { ClearFilters, InteractionRecord, LocalMemoryStore, QueryFilters, SummaryFilters } from './storage';

const LOG_TOOL_NAME = 'copilotLocalMemory_logInteraction';
const QUERY_TOOL_NAME = 'copilotLocalMemory_queryInteractions';
const RECENT_TOOL_NAME = 'copilotLocalMemory_getRecentInteractions';
const SUMMARY_TOOL_NAME = 'copilotLocalMemory_summarizeInteractions';
const CLEAR_TOOL_NAME = 'copilotLocalMemory_clearInteractions';

type LogInteractionInput = {
  request_type: string;
  prompt_text?: string;
  response_text?: string;
  model_version?: string;
  finish_reason?: string;
  ticket_id?: string;
  ticket_description?: string;
  pull_request_id?: string;
  project_name?: string;
};

type QueryInteractionsInput = {
  search_text?: string;
  project_name?: string;
  request_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
};

type RecentInteractionsInput = {
  project_name?: string;
  request_type?: string;
  limit?: number;
};

type SummaryInput = {
  project_name?: string;
  request_type?: string;
  start_date?: string;
  end_date?: string;
  group_by?: string;
  limit?: number;
};

type ClearInteractionsInput = {
  project_name?: string;
  request_type?: string;
  before_date?: string;
  delete_all?: boolean;
};

function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('copilotLocalMemory');
}

function isEnabled(): boolean {
  return getConfig().get<boolean>('enabled', true);
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function isPostInteractionCommandEnabled(): boolean {
  return getConfig().get<boolean>('enablePostInteractionCommand', true);
}

function getProjectName(overrideProjectName?: string): string {
  const normalizedOverride = normalizeOptionalString(overrideProjectName);
  if (normalizedOverride) {
    return normalizedOverride;
  }

  const configuredName = normalizeOptionalString(getConfig().get<string>('projectName'));
  if (configuredName) {
    return configuredName;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0].name;
  }

  return 'unknown-project';
}

function getDefaultLimit(requestedLimit?: number): number {
  const configuredLimit = getConfig().get<number>('defaultQueryLimit', 20);
  const fallbackLimit = Number.isFinite(configuredLimit) ? configuredLimit : 20;
  const effectiveLimit = requestedLimit ?? fallbackLimit;
  return Math.max(1, Math.min(100, Math.trunc(effectiveLimit)));
}

function getPostInteractionCommand(): string {
  return getConfig().get<string>('postInteractionCommand', '').trim();
}

function expandPostInteractionCommand(template: string, record: InteractionRecord): string {
  const replacements: Record<string, string> = {
    '{project_name}': record.project_name,
    '{request_type}': record.request_type,
    '{ticket_id}': record.ticket_id ?? '',
    '{pull_request_id}': record.pull_request_id ?? '',
    '{timestamp}': record.timestamp ?? new Date().toISOString(),
  };

  return Object.entries(replacements).reduce(
    (command, [placeholder, value]) => command.split(placeholder).join(value),
    template
  );
}

function runPostInteractionCommand(record: InteractionRecord): void {
  const configuredCommand = getPostInteractionCommand();
  if (!configuredCommand) {
    return;
  }

  const command = expandPostInteractionCommand(configuredCommand, record);

  try {
    const child = spawn(command, {
      shell: true,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    info('Executed post-interaction command:', command);
  } catch (commandError) {
    error('Failed to execute post-interaction command:', commandError);
  }
}

function validateIsoDate(dateValue: string | undefined, fieldName: string): void {
  if (!dateValue) {
    return;
  }

  const parsedDate = Date.parse(dateValue);
  if (Number.isNaN(parsedDate)) {
    throw new Error(`Invalid ${fieldName}: expected ISO-8601 date string.`);
  }
}

function hasClearCriteria(filters: ClearFilters): boolean {
  return Boolean(filters.project_name || filters.request_type || filters.before_date);
}

function createToolResult(payload: unknown): vscode.LanguageModelToolResult {
  return new vscode.LanguageModelToolResult([
    new vscode.LanguageModelTextPart(JSON.stringify(payload, null, 2)),
  ]);
}

function createDisabledResult(): vscode.LanguageModelToolResult {
  return createToolResult({
    success: false,
    error: 'Copilot Local Memory is disabled.',
  });
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  info('Copilot Local Memory extension is activating...');
  info(
    'Config:',
    'enabled=',
    getConfig().get<boolean>('enabled', true),
    'storePrompts=',
    getConfig().get<boolean>('storePrompts', true),
    'storeResponses=',
    getConfig().get<boolean>('storeResponses', true),
    'defaultQueryLimit=',
    getConfig().get<number>('defaultQueryLimit', 20),
    'enablePostInteractionCommand=',
    isPostInteractionCommandEnabled(),
    'postInteractionCommandSet=',
    Boolean(getPostInteractionCommand())
  );

  const store = new LocalMemoryStore(context);

  context.subscriptions.push(
    vscode.lm.registerTool<LogInteractionInput>(LOG_TOOL_NAME, {
      invoke: async (options) => {
        const input = options.input;
        if (!input.request_type) {
          return createToolResult({
            success: false,
            error: 'Missing request_type in tool input.',
          });
        }

        const allowPrompts = getConfig().get<boolean>('storePrompts', true);
        const allowResponses = getConfig().get<boolean>('storeResponses', true);

        const record: InteractionRecord = {
          project_name: getProjectName(input.project_name),
          request_type: input.request_type,
          prompt_text: allowPrompts ? input.prompt_text : undefined,
          response_text: allowResponses ? input.response_text : undefined,
          model_version: normalizeOptionalString(input.model_version),
          finish_reason: normalizeOptionalString(input.finish_reason),
          ticket_id: normalizeOptionalString(input.ticket_id),
          ticket_description: normalizeOptionalString(input.ticket_description),
          pull_request_id: normalizeOptionalString(input.pull_request_id),
        };

        const storageEnabled = isEnabled();
        const postInteractionCommandEnabled = isPostInteractionCommandEnabled();

        if (!storageEnabled && !postInteractionCommandEnabled) {
          info('Skipping log interaction: storage and post-interaction hook are both disabled.');
          return createDisabledResult();
        }

        if (!storageEnabled && postInteractionCommandEnabled) {
          runPostInteractionCommand(record);
          return createToolResult({
            success: true,
            message: 'Local storage is disabled. Post-interaction command executed without storing the interaction.',
            record,
            stored: false,
            post_interaction_command_executed: Boolean(getPostInteractionCommand()),
          });
        }

        try {
          const savedRecord = await store.logInteraction(record);
          if (postInteractionCommandEnabled) {
            runPostInteractionCommand(savedRecord);
          }
          return createToolResult({
            success: true,
            message: 'Interaction stored locally.',
            record: savedRecord,
            stored: true,
            post_interaction_command_executed:
              postInteractionCommandEnabled && Boolean(getPostInteractionCommand()),
          });
        } catch (storageError) {
          error('Failed to log local interaction:', storageError);
          return createToolResult({
            success: false,
            error:
              storageError instanceof Error ? storageError.message : 'Unknown local storage error.',
          });
        }
      },
    })
  );

  context.subscriptions.push(
    vscode.lm.registerTool<QueryInteractionsInput>(QUERY_TOOL_NAME, {
      invoke: async (options) => {
        if (!isEnabled()) {
          info('Skipping query interaction: extension disabled.');
          return createDisabledResult();
        }

        const filters: QueryFilters = {
          search_text: options.input.search_text,
          project_name: options.input.project_name,
          request_type: options.input.request_type,
          start_date: options.input.start_date,
          end_date: options.input.end_date,
          limit: getDefaultLimit(options.input.limit),
        };

        try {
          validateIsoDate(filters.start_date, 'start_date');
          validateIsoDate(filters.end_date, 'end_date');
          const records = await store.queryInteractions(filters);
          return createToolResult({
            success: true,
            count: records.length,
            records,
          });
        } catch (queryError) {
          error('Failed to query local interactions:', queryError);
          return createToolResult({
            success: false,
            error: queryError instanceof Error ? queryError.message : 'Unknown query error.',
          });
        }
      },
    })
  );

  context.subscriptions.push(
    vscode.lm.registerTool<RecentInteractionsInput>(RECENT_TOOL_NAME, {
      invoke: async (options) => {
        if (!isEnabled()) {
          info('Skipping recent interaction lookup: extension disabled.');
          return createDisabledResult();
        }

        try {
          const records = await store.getRecentInteractions({
            project_name: options.input.project_name,
            request_type: options.input.request_type,
            limit: getDefaultLimit(options.input.limit),
          });

          return createToolResult({
            success: true,
            count: records.length,
            records,
          });
        } catch (queryError) {
          error('Failed to fetch recent local interactions:', queryError);
          return createToolResult({
            success: false,
            error: queryError instanceof Error ? queryError.message : 'Unknown query error.',
          });
        }
      },
    })
  );

  context.subscriptions.push(
    vscode.lm.registerTool<SummaryInput>(SUMMARY_TOOL_NAME, {
      invoke: async (options) => {
        if (!isEnabled()) {
          info('Skipping summary lookup: extension disabled.');
          return createDisabledResult();
        }

        const filters: SummaryFilters = {
          project_name: options.input.project_name,
          request_type: options.input.request_type,
          start_date: options.input.start_date,
          end_date: options.input.end_date,
          group_by: options.input.group_by,
          limit: getDefaultLimit(options.input.limit),
        };

        try {
          validateIsoDate(filters.start_date, 'start_date');
          validateIsoDate(filters.end_date, 'end_date');
          const summary = await store.summarizeInteractions(filters);
          return createToolResult({
            success: true,
            ...summary,
          });
        } catch (summaryError) {
          error('Failed to summarize local interactions:', summaryError);
          return createToolResult({
            success: false,
            error: summaryError instanceof Error ? summaryError.message : 'Unknown summary error.',
          });
        }
      },
    })
  );

  context.subscriptions.push(
    vscode.lm.registerTool<ClearInteractionsInput>(CLEAR_TOOL_NAME, {
      invoke: async (options) => {
        if (!isEnabled()) {
          info('Skipping clear interaction request: extension disabled.');
          return createDisabledResult();
        }

        const filters: ClearFilters = {
          project_name: options.input.project_name,
          request_type: options.input.request_type,
          before_date: options.input.before_date,
          delete_all: options.input.delete_all,
        };

        try {
          validateIsoDate(filters.before_date, 'before_date');

          if (!hasClearCriteria(filters) && !filters.delete_all) {
            return createToolResult({
              success: false,
              error:
                'Clear request needs at least one criterion (project_name, request_type, before_date) or delete_all=true.',
            });
          }

          const result = await store.clearInteractions(filters);
          return createToolResult({
            success: true,
            message: result.deleted_count > 0 ? 'Local interactions deleted.' : 'No matching local interactions found.',
            ...result,
          });
        } catch (clearError) {
          error('Failed to clear local interactions:', clearError);
          return createToolResult({
            success: false,
            error: clearError instanceof Error ? clearError.message : 'Unknown clear error.',
          });
        }
      },
    })
  );

  info('Copilot Local Memory extension activated.');
}

export function deactivate(): void {
  info('Copilot Local Memory extension deactivated.');
}