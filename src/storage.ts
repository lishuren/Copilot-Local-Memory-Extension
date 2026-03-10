import * as path from 'path';
import * as vscode from 'vscode';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { error, info } from './logger';

const DATABASE_FILE_NAME = 'copilot-local-memory.sqlite';
const VALID_SUMMARY_GROUP_BY = new Set([
  'request_type',
  'project_name',
  'model_version',
  'finish_reason',
]);

export type InteractionRecord = {
  id?: number;
  project_name: string;
  request_type: string;
  prompt_text?: string;
  response_text?: string;
  model_version?: string;
  finish_reason?: string;
  timestamp?: string;
  ticket_id?: string;
  ticket_description?: string;
  pull_request_id?: string;
};

export type QueryFilters = {
  search_text?: string;
  project_name?: string;
  request_type?: string;
  start_date?: string;
  end_date?: string;
  limit: number;
};

export type SummaryFilters = {
  project_name?: string;
  request_type?: string;
  start_date?: string;
  end_date?: string;
  group_by?: string;
  limit: number;
};

export type ClearFilters = {
  project_name?: string;
  request_type?: string;
  before_date?: string;
  delete_all?: boolean;
};

type SummaryRow = {
  key: string | null;
  count: number;
};

export class LocalMemoryStore {
  private readonly storageDirectory: vscode.Uri;
  private readonly databaseFile: vscode.Uri;
  private sqlJs?: SqlJsStatic;
  private database?: Database;
  private databasePromise?: Promise<Database>;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(context: vscode.ExtensionContext) {
    this.storageDirectory = context.globalStorageUri;
    this.databaseFile = vscode.Uri.joinPath(this.storageDirectory, DATABASE_FILE_NAME);
  }

  async logInteraction(record: InteractionRecord): Promise<InteractionRecord> {
    return this.enqueueWrite(async () => {
      const database = await this.getDatabase();
      const timestamp = record.timestamp ?? new Date().toISOString();
      const statement = database.prepare(`
        INSERT INTO copilot_usage (
          project_name,
          request_type,
          prompt_text,
          response_text,
          model_version,
          finish_reason,
          timestamp,
          ticket_id,
          ticket_description,
          pull_request_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      try {
        statement.run([
          record.project_name,
          record.request_type,
          record.prompt_text ?? null,
          record.response_text ?? null,
          record.model_version ?? null,
          record.finish_reason ?? null,
          timestamp,
          record.ticket_id ?? null,
          record.ticket_description ?? null,
          record.pull_request_id ?? null,
        ]);
      } finally {
        statement.free();
      }

      const insertedId = Number(database.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0] ?? 0);
      await this.persistDatabase(database);

      return {
        ...record,
        id: insertedId,
        timestamp,
      };
    });
  }

  async queryInteractions(filters: QueryFilters): Promise<InteractionRecord[]> {
    const database = await this.getDatabase();
    const { clause, parameters } = this.buildWhereClause(filters);
    const statement = database.prepare(`
      SELECT id, project_name, request_type, prompt_text, response_text, model_version,
             finish_reason, timestamp, ticket_id, ticket_description, pull_request_id
      FROM copilot_usage
      ${clause}
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    try {
      statement.bind([...parameters, filters.limit]);
      return this.readInteractionRows(statement);
    } finally {
      statement.free();
    }
  }

  async getRecentInteractions(filters: Omit<QueryFilters, 'search_text' | 'start_date' | 'end_date'>): Promise<InteractionRecord[]> {
    return this.queryInteractions({
      limit: filters.limit,
      project_name: filters.project_name,
      request_type: filters.request_type,
    });
  }

  async summarizeInteractions(filters: SummaryFilters): Promise<{
    total_count: number;
    grouped_by: string | null;
    grouped_counts: SummaryRow[];
  }> {
    const database = await this.getDatabase();
    const { clause, parameters } = this.buildWhereClause({
      project_name: filters.project_name,
      request_type: filters.request_type,
      start_date: filters.start_date,
      end_date: filters.end_date,
    });

    const totalStatement = database.prepare(`
      SELECT COUNT(*) AS total_count
      FROM copilot_usage
      ${clause}
    `);

    try {
      totalStatement.bind(parameters);
      const totalRows = this.readRows(totalStatement);
      const totalCount = Number(totalRows[0]?.total_count ?? 0);

      if (!filters.group_by) {
        return {
          total_count: totalCount,
          grouped_by: null,
          grouped_counts: [],
        };
      }

      if (!VALID_SUMMARY_GROUP_BY.has(filters.group_by)) {
        throw new Error(
          `Unsupported group_by value: ${filters.group_by}. Expected one of ${Array.from(VALID_SUMMARY_GROUP_BY).join(', ')}`
        );
      }

      const summaryStatement = database.prepare(`
        SELECT ${filters.group_by} AS grouping_key, COUNT(*) AS count
        FROM copilot_usage
        ${clause}
        GROUP BY ${filters.group_by}
        ORDER BY count DESC, grouping_key ASC
        LIMIT ?
      `);

      try {
        summaryStatement.bind([...parameters, filters.limit]);
        const groupedCounts = this.readRows(summaryStatement).map((row) => ({
          key: row.grouping_key === null ? null : String(row.grouping_key),
          count: Number(row.count ?? 0),
        }));

        return {
          total_count: totalCount,
          grouped_by: filters.group_by,
          grouped_counts: groupedCounts,
        };
      } finally {
        summaryStatement.free();
      }
    } finally {
      totalStatement.free();
    }
  }

  async clearInteractions(filters: ClearFilters): Promise<{
    deleted_count: number;
    delete_all: boolean;
    criteria: Omit<ClearFilters, 'delete_all'>;
  }> {
    return this.enqueueWrite(async () => {
      const database = await this.getDatabase();
      const criteria = {
        project_name: filters.project_name,
        request_type: filters.request_type,
        before_date: filters.before_date,
      };
      const hasCriteria = Boolean(criteria.project_name || criteria.request_type || criteria.before_date);

      if (!hasCriteria && !filters.delete_all) {
        throw new Error(
          'Refusing to clear local memory without criteria. Provide project_name, request_type, before_date, or set delete_all=true.'
        );
      }

      const { clause, parameters } = this.buildClearWhereClause(filters);
      const countStatement = database.prepare(`
        SELECT COUNT(*) AS total_count
        FROM copilot_usage
        ${clause}
      `);

      let deletedCount = 0;

      try {
        countStatement.bind(parameters);
        const countRows = this.readRows(countStatement);
        deletedCount = Number(countRows[0]?.total_count ?? 0);
      } finally {
        countStatement.free();
      }

      if (deletedCount > 0) {
        const deleteStatement = database.prepare(`
          DELETE FROM copilot_usage
          ${clause}
        `);

        try {
          deleteStatement.run(parameters);
        } finally {
          deleteStatement.free();
        }

        await this.persistDatabase(database);
      }

      return {
        deleted_count: deletedCount,
        delete_all: Boolean(filters.delete_all),
        criteria,
      };
    });
  }

  private async getDatabase(): Promise<Database> {
    if (this.database) {
      return this.database;
    }

    if (!this.databasePromise) {
      this.databasePromise = this.openDatabase();
    }

    this.database = await this.databasePromise;
    return this.database;
  }

  private async openDatabase(): Promise<Database> {
    await vscode.workspace.fs.createDirectory(this.storageDirectory);
    const sqlJs = await this.getSqlJs();
    let database: Database;

    try {
      const existingBytes = await vscode.workspace.fs.readFile(this.databaseFile);
      database = new sqlJs.Database(existingBytes);
      info('Loaded local memory database from', this.databaseFile.fsPath);
    } catch {
      database = new sqlJs.Database();
      info('Created new local memory database at', this.databaseFile.fsPath);
    }

    this.initializeSchema(database);
    await this.persistDatabase(database);
    return database;
  }

  private async getSqlJs(): Promise<SqlJsStatic> {
    if (this.sqlJs) {
      return this.sqlJs;
    }

    this.sqlJs = await initSqlJs({
      locateFile: (fileName: string) => {
        if (fileName === 'sql-wasm.wasm') {
          return require.resolve('sql.js/dist/sql-wasm.wasm');
        }
        return path.join(path.dirname(require.resolve('sql.js/dist/sql-wasm.js')), fileName);
      },
    });

    return this.sqlJs;
  }

  private initializeSchema(database: Database): void {
    database.run(`
      CREATE TABLE IF NOT EXISTS copilot_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        request_type TEXT NOT NULL,
        prompt_text TEXT,
        response_text TEXT,
        model_version TEXT,
        finish_reason TEXT,
        timestamp TEXT NOT NULL,
        ticket_id TEXT,
        ticket_description TEXT,
        pull_request_id TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON copilot_usage(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_usage_project_ci ON copilot_usage(project_name COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_usage_request_type_ci ON copilot_usage(request_type COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_usage_ticket_id_ci ON copilot_usage(ticket_id COLLATE NOCASE);
    `);
  }

  private async persistDatabase(database: Database): Promise<void> {
    const exportedBytes = database.export();
    await vscode.workspace.fs.writeFile(this.databaseFile, exportedBytes);
  }

  private buildWhereClause(filters: Omit<QueryFilters, 'limit'>): {
    clause: string;
    parameters: Array<string>;
  } {
    const conditions: string[] = [];
    const parameters: string[] = [];

    if (filters.project_name) {
      conditions.push('LOWER(project_name) = LOWER(?)');
      parameters.push(filters.project_name);
    }

    if (filters.request_type) {
      conditions.push('LOWER(request_type) = LOWER(?)');
      parameters.push(filters.request_type);
    }

    if (filters.start_date) {
      conditions.push('timestamp >= ?');
      parameters.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push('timestamp <= ?');
      parameters.push(filters.end_date);
    }

    if (filters.search_text) {
      conditions.push(`(
        LOWER(COALESCE(prompt_text, '')) LIKE LOWER(?) OR
        LOWER(COALESCE(response_text, '')) LIKE LOWER(?) OR
        LOWER(COALESCE(ticket_description, '')) LIKE LOWER(?)
      )`);
      const pattern = `%${filters.search_text}%`;
      parameters.push(pattern, pattern, pattern);
    }

    if (conditions.length === 0) {
      return { clause: '', parameters };
    }

    return {
      clause: `WHERE ${conditions.join(' AND ')}`,
      parameters,
    };
  }

  private buildClearWhereClause(filters: ClearFilters): {
    clause: string;
    parameters: Array<string>;
  } {
    const conditions: string[] = [];
    const parameters: string[] = [];

    if (filters.project_name) {
      conditions.push('LOWER(project_name) = LOWER(?)');
      parameters.push(filters.project_name);
    }

    if (filters.request_type) {
      conditions.push('LOWER(request_type) = LOWER(?)');
      parameters.push(filters.request_type);
    }

    if (filters.before_date) {
      conditions.push('timestamp <= ?');
      parameters.push(filters.before_date);
    }

    if (conditions.length === 0) {
      return { clause: '', parameters };
    }

    return {
      clause: `WHERE ${conditions.join(' AND ')}`,
      parameters,
    };
  }

  private readInteractionRows(statement: ReturnType<Database['prepare']>): InteractionRecord[] {
    const rows = this.readRows(statement);
    return rows.map((row) => ({
      id: row.id === null || row.id === undefined ? undefined : Number(row.id),
      project_name: String(row.project_name),
      request_type: String(row.request_type),
      prompt_text: row.prompt_text === null ? undefined : String(row.prompt_text),
      response_text: row.response_text === null ? undefined : String(row.response_text),
      model_version: row.model_version === null ? undefined : String(row.model_version),
      finish_reason: row.finish_reason === null ? undefined : String(row.finish_reason),
      timestamp: row.timestamp === null ? undefined : String(row.timestamp),
      ticket_id: row.ticket_id === null ? undefined : String(row.ticket_id),
      ticket_description:
        row.ticket_description === null ? undefined : String(row.ticket_description),
      pull_request_id:
        row.pull_request_id === null ? undefined : String(row.pull_request_id),
    }));
  }

  private readRows(statement: ReturnType<Database['prepare']>): Array<Record<string, unknown>> {
    const rows: Array<Record<string, unknown>> = [];

    while (statement.step()) {
      rows.push(statement.getAsObject());
    }

    return rows;
  }

  private async enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
    let result: T | undefined;

    const runOperation = async () => {
      result = await operation();
    };

    this.writeChain = this.writeChain.then(runOperation, async () => {
      error('Previous local memory write failed; continuing with next write.');
      await runOperation();
    });

    await this.writeChain;
    return result as T;
  }
}