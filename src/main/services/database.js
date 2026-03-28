const { Pool, Client } = require('pg');
const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(
  require('os').homedir(),
  '.yumbosql_connections.json'
);

class DatabaseService {
  constructor() {
    /** @type {Map<string, Pool>} */
    this.connections = new Map();
    /** @type {Map<string, object>} connId → config (including password, in-memory only) */
    this.connectionConfigs = new Map();
    /** @type {Map<string, string[]>} parentConnId → [childConnId, ...] */
    this.subConnections = new Map();
    this.nextId = 1;
  }

  // ── Connection history ───────────────────────────────────────

  loadConnectionHistory() {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }
    return [];
  }

  saveConnectionToHistory(config) {
    const history = this.loadConnectionHistory();
    // Remove password from stored config
    const entry = {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      ssl: config.ssl || false,
      lastUsed: new Date().toISOString(),
    };
    // Remove duplicate
    const filtered = history.filter(
      (h) => !(h.host === entry.host && h.port === entry.port && h.user === entry.user && h.database === entry.database)
    );
    filtered.unshift(entry);
    // Keep last 20
    const trimmed = filtered.slice(0, 20);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
    return trimmed;
  }

  removeConnectionFromHistory(index) {
    const history = this.loadConnectionHistory();
    history.splice(index, 1);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
    return history;
  }

  /**
   * Connect to a PostgreSQL server.
   * @param {{ host: string, port: number, user: string, password: string, database: string, ssl?: boolean }} config
   * @returns {Promise<string>} connection id
   */
  async connect(config) {
    const pool = new Pool({
      host: config.host,
      port: config.port || 5432,
      user: config.user,
      password: config.password,
      database: config.database || 'postgres',
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 5,
    });

    // Verify the connection works
    const testClient = await pool.connect();
    testClient.release();

    const connId = `conn_${this.nextId++}`;
    this.connections.set(connId, pool);
    this.connectionConfigs.set(connId, {
      host: config.host,
      port: config.port || 5432,
      user: config.user,
      password: config.password,
      database: config.database || 'postgres',
      ssl: config.ssl || false,
    });
    return connId;
  }

  /**
   * Create a new connection to a different database on the same server.
   * Sub-connections are automatically cleaned up when the parent disconnects.
   * @param {string} parentConnId
   * @param {string} dbName
   * @returns {Promise<string>} new connection id
   */
  async connectToDatabase(parentConnId, dbName) {
    const config = this.connectionConfigs.get(parentConnId);
    if (!config) throw new Error('Parent connection not found');

    // Reuse existing sub-connection to same database if available
    const subs = this.subConnections.get(parentConnId) || [];
    for (const subId of subs) {
      const subCfg = this.connectionConfigs.get(subId);
      if (subCfg && subCfg.database === dbName) return subId;
    }

    // If the parent connection already connects to this db, return parent
    if (config.database === dbName) return parentConnId;

    const pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: dbName,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 3,
    });

    const testClient = await pool.connect();
    testClient.release();

    const connId = `conn_${this.nextId++}`;
    this.connections.set(connId, pool);
    this.connectionConfigs.set(connId, { ...config, database: dbName });
    subs.push(connId);
    this.subConnections.set(parentConnId, subs);
    return connId;
  }

  async disconnect(connId) {
    // Disconnect all sub-connections first
    const subs = this.subConnections.get(connId) || [];
    for (const subId of subs) {
      const subPool = this.connections.get(subId);
      if (subPool) {
        await subPool.end().catch(() => {});
        this.connections.delete(subId);
        this.connectionConfigs.delete(subId);
      }
    }
    this.subConnections.delete(connId);

    const pool = this.connections.get(connId);
    if (pool) {
      await pool.end();
      this.connections.delete(connId);
      this.connectionConfigs.delete(connId);
    }
  }

  disconnectAll() {
    for (const [, pool] of this.connections) {
      pool.end().catch(() => {});
    }
    this.connections.clear();
    this.connectionConfigs.clear();
    this.subConnections.clear();
  }

  async testConnection(config) {
    const client = new Client({
      host: config.host,
      port: config.port || 5432,
      user: config.user,
      password: config.password,
      database: config.database || 'postgres',
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
    } finally {
      await client.end();
    }
  }

  /**
   * Execute an arbitrary SQL query.
   */
  async query(connId, sql) {
    const pool = this._getPool(connId);
    const result = await pool.query(sql);
    return {
      rows: result.rows,
      fields: result.fields?.map((f) => ({
        name: f.name,
        dataTypeID: f.dataTypeID,
      })),
      rowCount: result.rowCount,
      command: result.command,
    };
  }

  // ── Object Explorer helpers ──────────────────────────────────

  async getDatabases(connId) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT datname AS name FROM pg_database
       WHERE datistemplate = false ORDER BY datname`
    );
    return rows;
  }

  async getSchemas(connId) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT schema_name AS name
       FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
       ORDER BY schema_name`
    );
    return rows;
  }

  async getTables(connId, schema) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT table_name AS name
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      [schema]
    );
    return rows;
  }

  async getViews(connId, schema) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT table_name AS name
       FROM information_schema.views
       WHERE table_schema = $1
       ORDER BY table_name`,
      [schema]
    );
    return rows;
  }

  async getColumns(connId, schema, table) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT column_name AS name,
              data_type AS type,
              is_nullable AS nullable,
              column_default AS default_value,
              ordinal_position AS position,
              is_identity,
              is_generated
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, table]
    );
    return rows;
  }

  async insertRow(connId, schema, table, values) {
    const pool = this._getPool(connId);
    const safeSchema = schema.replace(/"/g, '""');
    const safeTable = table.replace(/"/g, '""');
    const safeName = `"${safeSchema}"."${safeTable}"`;
    // Only include keys that were explicitly provided (skip auto-fill columns passed as undefined)
    const keys = Object.keys(values).filter((k) => values[k] !== undefined);
    if (keys.length === 0) {
      const { rowCount } = await pool.query(`INSERT INTO ${safeName} DEFAULT VALUES`);
      return { rowCount };
    }
    const cols = keys.map((k) => `"${k.replace(/"/g, '""')}"`).join(', ');
    const params = keys.map((_, i) => `$${i + 1}`).join(', ');
    const vals = keys.map((k) => values[k] === '' ? null : values[k]);
    const { rowCount } = await pool.query(
      `INSERT INTO ${safeName} (${cols}) VALUES (${params})`,
      vals
    );
    return { rowCount };
  }

  async getPrimaryKeyColumns(connId, schema, table) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
         AND tc.table_name = kcu.table_name
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = $1
         AND tc.table_name = $2
       ORDER BY kcu.ordinal_position`,
      [schema, table]
    );
    return rows.map((r) => r.column_name);
  }

  async updateRow(connId, schema, table, values, pkValues) {
    const pool = this._getPool(connId);
    const safeSchema = schema.replace(/"/g, '""');
    const safeTable = table.replace(/"/g, '""');
    const safeName = `"${safeSchema}"."${safeTable}"`;
    const setKeys = Object.keys(values);
    const whereKeys = Object.keys(pkValues);
    let paramIdx = 1;
    const setClauses = setKeys.map((k) => `"${k.replace(/"/g, '""')}" = $${paramIdx++}`);
    const whereClauses = whereKeys.map((k) => `"${k.replace(/"/g, '""')}" = $${paramIdx++}`);
    const setVals = setKeys.map((k) => (values[k] === '' ? null : values[k]));
    const whereVals = whereKeys.map((k) => pkValues[k]);
    const { rowCount } = await pool.query(
      `UPDATE ${safeName} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`,
      [...setVals, ...whereVals]
    );
    return { rowCount };
  }

  async getTableData(connId, schema, table, limit = 100, offset = 0) {
    const pool = this._getPool(connId);
    // Sanitize schema/table names since they can't be parameterized
    const safeName = `"${schema.replace(/"/g, '""')}"."${table.replace(/"/g, '""')}"`;
    const countResult = await pool.query(`SELECT COUNT(*) AS total FROM ${safeName}`);
    const dataResult = await pool.query(
      `SELECT * FROM ${safeName} LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return {
      rows: dataResult.rows,
      fields: dataResult.fields?.map((f) => ({
        name: f.name,
        dataTypeID: f.dataTypeID,
      })),
      total: parseInt(countResult.rows[0].total, 10),
    };
  }

  // ── Table DDL generation ──────────────────────────────────────

  async getTableDDL(connId, schema, table) {
    const pool = this._getPool(connId);
    const safeName = `"${schema.replace(/"/g, '""')}"."${table.replace(/"/g, '""')}"`;

    // Columns
    const { rows: cols } = await pool.query(
      `SELECT column_name, data_type, character_maximum_length,
              is_nullable, column_default, udt_name,
              numeric_precision, numeric_scale
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, table]
    );

    // Constraints
    const { rows: constraints } = await pool.query(
      `SELECT con.conname AS name,
              con.contype AS type,
              pg_get_constraintdef(con.oid) AS definition
       FROM pg_constraint con
       JOIN pg_namespace n ON n.oid = con.connamespace
       WHERE n.nspname = $1
         AND con.conrelid = (SELECT oid FROM pg_class WHERE relname = $2 AND relnamespace = n.oid)`,
      [schema, table]
    );

    // Indexes (non-constraint)
    const { rows: indexes } = await pool.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = $1 AND tablename = $2
         AND indexname NOT IN (
           SELECT conname FROM pg_constraint
           WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = $1)
         )`,
      [schema, table]
    );

    // Build DDL
    let ddl = `-- Tábla: ${safeName}\n`;
    ddl += `-- Módosítsd a kívánt részeket, majd futtasd a scriptet (Cmd+Enter)\n\n`;

    // Column type helper
    const colType = (c) => {
      if (c.udt_name === 'varchar' && c.character_maximum_length) return `VARCHAR(${c.character_maximum_length})`;
      if (c.udt_name === 'numeric' && c.numeric_precision) {
        return c.numeric_scale ? `NUMERIC(${c.numeric_precision}, ${c.numeric_scale})` : `NUMERIC(${c.numeric_precision})`;
      }
      return c.data_type.toUpperCase();
    };

    // ALTER TABLE examples for each column
    ddl += `-- Oszlopok:\n`;
    for (const c of cols) {
      const nullable = c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = c.column_default ? ` DEFAULT ${c.column_default}` : '';
      ddl += `-- ALTER TABLE ${safeName} ALTER COLUMN "${c.column_name}" TYPE ${colType(c)};\n`;
      ddl += `-- ALTER TABLE ${safeName} ALTER COLUMN "${c.column_name}" ${c.is_nullable === 'YES' ? 'DROP NOT NULL' : 'SET NOT NULL'};\n`;
      if (c.column_default) {
        ddl += `-- ALTER TABLE ${safeName} ALTER COLUMN "${c.column_name}" SET DEFAULT ${c.column_default};\n`;
      }
      ddl += `\n`;
    }

    // Add column template
    ddl += `-- Új oszlop hozzáadása:\n`;
    ddl += `-- ALTER TABLE ${safeName} ADD COLUMN "new_column" VARCHAR(255) NULL;\n\n`;

    // Drop column template
    ddl += `-- Oszlop törlése:\n`;
    ddl += `-- ALTER TABLE ${safeName} DROP COLUMN "column_name";\n\n`;

    // Constraints
    if (constraints.length > 0) {
      ddl += `-- Constraintek:\n`;
      for (const con of constraints) {
        const typeLabel = { p: 'PRIMARY KEY', f: 'FOREIGN KEY', u: 'UNIQUE', c: 'CHECK' }[con.type] || con.type;
        ddl += `-- [${typeLabel}] ${con.name}: ${con.definition}\n`;
        ddl += `-- ALTER TABLE ${safeName} DROP CONSTRAINT "${con.name}";\n`;
      }
      ddl += `\n`;
    }

    // Indexes
    if (indexes.length > 0) {
      ddl += `-- Indexek:\n`;
      for (const idx of indexes) {
        ddl += `-- ${idx.indexdef};\n`;
        ddl += `-- DROP INDEX "${schema}"."${idx.indexname}";\n`;
      }
      ddl += `\n`;
    }

    // Rename table template
    ddl += `-- Tábla átnevezése:\n`;
    ddl += `-- ALTER TABLE ${safeName} RENAME TO "new_name";\n\n`;

    // Drop table template
    ddl += `-- Tábla törlése:\n`;
    ddl += `-- DROP TABLE ${safeName};\n`;

    return ddl;
  }

  // ── Object Explorer: full tree ────────────────────────────────

  async getFunctions(connId, schema) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT p.proname AS name,
              pg_get_function_identity_arguments(p.oid) AS args,
              CASE p.prokind
                WHEN 'f' THEN 'function'
                WHEN 'p' THEN 'procedure'
                WHEN 'a' THEN 'aggregate'
                WHEN 'w' THEN 'window'
                ELSE 'function'
              END AS kind,
              t.typname AS return_type
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       LEFT JOIN pg_type t ON t.oid = p.prorettype
       WHERE n.nspname = $1
         AND p.prokind IN ('f', 'p', 'a', 'w')
       ORDER BY p.proname`,
      [schema]
    );
    return rows;
  }

  async getSequences(connId, schema) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT sequencename AS name
       FROM pg_sequences
       WHERE schemaname = $1
       ORDER BY sequencename`,
      [schema]
    );
    return rows;
  }

  async getTypes(connId, schema) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT t.typname AS name,
              CASE t.typtype
                WHEN 'e' THEN 'enum'
                WHEN 'c' THEN 'composite'
                WHEN 'd' THEN 'domain'
                WHEN 'r' THEN 'range'
                ELSE 'other'
              END AS kind
       FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = $1
         AND t.typtype IN ('e', 'c', 'd', 'r')
       ORDER BY t.typname`,
      [schema]
    );
    return rows;
  }

  async getCompleteCreateScript(connId, schema, table) {
    const pool = this._getPool(connId);
    const fqn = `"${schema.replace(/"/g, '""')}"."${table.replace(/"/g, '""')}"`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // ── Columns ──────────────────────────────────────────────
    const { rows: cols } = await pool.query(
      `SELECT column_name, data_type, character_maximum_length,
              is_nullable, column_default, udt_name,
              numeric_precision, numeric_scale,
              is_identity, identity_generation, is_generated
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, table]
    );

    // ── Constraints ───────────────────────────────────────────
    const { rows: constraints } = await pool.query(
      `SELECT con.conname AS name,
              con.contype AS type,
              pg_get_constraintdef(con.oid) AS definition
       FROM pg_constraint con
       JOIN pg_namespace n ON n.oid = con.connamespace
       WHERE n.nspname = $1
         AND con.conrelid = (SELECT oid FROM pg_class WHERE relname = $2 AND relnamespace = n.oid)
       ORDER BY con.contype, con.conname`,
      [schema, table]
    );

    // ── Indexes (non-constraint) ───────────────────────────────
    const { rows: indexes } = await pool.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = $1 AND tablename = $2
         AND indexname NOT IN (
           SELECT conname FROM pg_constraint
           WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = $1)
         )
       ORDER BY indexname`,
      [schema, table]
    );

    // ── Triggers ──────────────────────────────────────────────
    const { rows: triggers } = await pool.query(
      `SELECT tg.tgname AS name,
              pg_get_triggerdef(tg.oid) AS definition
       FROM pg_trigger tg
       JOIN pg_class c ON c.oid = tg.tgrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = $1 AND c.relname = $2
         AND NOT tg.tgisinternal
       ORDER BY tg.tgname`,
      [schema, table]
    );

    // ── Sequences owned by this table's columns ────────────────
    const { rows: sequences } = await pool.query(
      `SELECT ns.nspname AS schema,
              sq.relname AS name,
              seq.seqstart AS start_value,
              seq.seqincrement AS increment_by,
              seq.seqmin AS min_value,
              seq.seqmax AS max_value,
              seq.seqcycle AS cycle,
              seq.seqcache AS cache
       FROM pg_depend d
       JOIN pg_class sq ON sq.oid = d.objid AND sq.relkind = 'S'
       JOIN pg_namespace ns ON ns.oid = sq.relnamespace
       JOIN pg_sequence seq ON seq.seqrelid = sq.oid
       JOIN pg_class t ON t.oid = d.refobjid
       JOIN pg_namespace tn ON tn.oid = t.relnamespace
       WHERE tn.nspname = $1 AND t.relname = $2
         AND d.refclassid = 'pg_class'::regclass
         AND d.deptype = 'a'
       ORDER BY sq.relname`,
      [schema, table]
    );

    // ── Type helper ───────────────────────────────────────────
    const colType = (c) => {
      const dt = c.data_type.toLowerCase();
      const udt = c.udt_name;
      if (dt === 'character varying' || udt === 'varchar') {
        return c.character_maximum_length ? `VARCHAR(${c.character_maximum_length})` : 'TEXT';
      }
      if (dt === 'character' || udt === 'bpchar') {
        return c.character_maximum_length ? `CHAR(${c.character_maximum_length})` : 'CHAR';
      }
      if (dt === 'numeric' || udt === 'numeric') {
        if (c.numeric_precision != null && c.numeric_scale != null) {
          return `NUMERIC(${c.numeric_precision}, ${c.numeric_scale})`;
        }
        if (c.numeric_precision != null) return `NUMERIC(${c.numeric_precision})`;
        return 'NUMERIC';
      }
      if (dt === 'array') {
        const base = udt.startsWith('_') ? udt.slice(1) : udt;
        return `${base.toUpperCase()}[]`;
      }
      if (dt === 'user-defined') return udt;
      if (dt === 'timestamp without time zone') return 'TIMESTAMP';
      if (dt === 'timestamp with time zone') return 'TIMESTAMPTZ';
      if (dt === 'time without time zone') return 'TIME';
      if (dt === 'time with time zone') return 'TIMETZ';
      if (dt === 'double precision') return 'FLOAT8';
      if (dt === 'real') return 'FLOAT4';
      return dt.toUpperCase();
    };

    // ── Build script ──────────────────────────────────────────
    let script = `-- ──────────────────────────────────────────────────────────\n`;
    script    += `-- Table: ${fqn}\n`;
    script    += `-- Generated by YumboSQL on ${now}\n`;
    script    += `-- ──────────────────────────────────────────────────────────\n`;

    // Sequences
    if (sequences.length > 0) {
      script += `\n-- ── Sequences ────────────────────────────────────────────\n`;
      for (const s of sequences) {
        const sfqn = `"${s.schema}"."${s.name}"`;
        const minClause = BigInt(s.min_value) === 1n ? 'NO MINVALUE' : `MINVALUE ${s.min_value}`;
        const maxClause = BigInt(s.max_value) >= 9223372036854775807n ? 'NO MAXVALUE' : `MAXVALUE ${s.max_value}`;
        script += `\nCREATE SEQUENCE IF NOT EXISTS ${sfqn}\n`;
        script += `  START WITH ${s.start_value}\n`;
        script += `  INCREMENT BY ${s.increment_by}\n`;
        script += `  ${minClause}\n`;
        script += `  ${maxClause}\n`;
        script += `  CACHE ${s.cache}${s.cycle ? '\n  CYCLE' : ''};\n`;
      }
    }

    // Create Table
    script += `\n-- ── Table ────────────────────────────────────────────────\n`;
    script += `\nCREATE TABLE IF NOT EXISTS ${fqn} (\n`;
    const colDefs = cols.map((c) => {
      if (c.is_identity === 'YES') {
        const gen = c.identity_generation === 'ALWAYS' ? 'ALWAYS' : 'BY DEFAULT';
        return `  "${c.column_name}" ${colType(c)} GENERATED ${gen} AS IDENTITY`;
      }
      if (c.is_generated === 'ALWAYS') {
        // generated computed column – skip default
        return `  "${c.column_name}" ${colType(c)} GENERATED ALWAYS AS (${c.column_default}) STORED`;
      }
      let def = `  "${c.column_name}" ${colType(c)}`;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      if (c.column_default) def += ` DEFAULT ${c.column_default}`;
      return def;
    });
    script += colDefs.join(',\n');
    script += '\n);\n';

    // Constraints
    if (constraints.length > 0) {
      script += `\n-- ── Constraints ──────────────────────────────────────────\n`;
      for (const con of constraints) {
        script += `\nALTER TABLE ${fqn}\n  ADD CONSTRAINT "${con.name}" ${con.definition};\n`;
      }
    }

    // Indexes
    if (indexes.length > 0) {
      script += `\n-- ── Indexes ──────────────────────────────────────────────\n`;
      for (const idx of indexes) {
        // pg_indexes.indexdef already contains the full statement; make it IF NOT EXISTS
        const indexSql = idx.indexdef.replace(/^CREATE (UNIQUE )?INDEX /, `CREATE $1INDEX IF NOT EXISTS `);
        script += `\n${indexSql};\n`;
      }
    }

    // Triggers
    if (triggers.length > 0) {
      script += `\n-- ── Triggers ─────────────────────────────────────────────\n`;
      for (const tg of triggers) {
        const tgSql = tg.definition.replace(/^CREATE TRIGGER /, 'CREATE OR REPLACE TRIGGER ');
        script += `\n${tgSql};\n`;
      }
    }

    return script;
  }

  async getIndexes(connId, schema, table) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT i.relname AS name,
              ix.indisunique AS is_unique,
              ix.indisprimary AS is_primary,
              pg_get_indexdef(ix.indexrelid) AS definition
       FROM pg_index ix
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_class t ON t.oid = ix.indrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = $1 AND t.relname = $2
       ORDER BY i.relname`,
      [schema, table]
    );
    return rows;
  }

  async getConstraints(connId, schema, table) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT con.conname AS name,
              CASE con.contype
                WHEN 'p' THEN 'PRIMARY KEY'
                WHEN 'f' THEN 'FOREIGN KEY'
                WHEN 'u' THEN 'UNIQUE'
                WHEN 'c' THEN 'CHECK'
                WHEN 'x' THEN 'EXCLUDE'
                ELSE con.contype
              END AS type,
              pg_get_constraintdef(con.oid) AS definition
       FROM pg_constraint con
       JOIN pg_class c ON c.oid = con.conrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = $1 AND c.relname = $2
       ORDER BY con.contype, con.conname`,
      [schema, table]
    );
    return rows;
  }

  async getTriggers(connId, schema, table) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT tg.tgname AS name,
              CASE
                WHEN tg.tgtype & 2 = 2 THEN 'BEFORE'
                WHEN tg.tgtype & 64 = 64 THEN 'INSTEAD OF'
                ELSE 'AFTER'
              END AS timing,
              p.proname AS function_name,
              tg.tgenabled AS enabled
       FROM pg_trigger tg
       JOIN pg_class c ON c.oid = tg.tgrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_proc p ON p.oid = tg.tgfoid
       WHERE n.nspname = $1 AND c.relname = $2
         AND NOT tg.tgisinternal
       ORDER BY tg.tgname`,
      [schema, table]
    );
    return rows;
  }

  async getRoles(connId) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT rolname AS name,
              rolsuper AS is_superuser,
              rolcreatedb AS can_create_db,
              rolcreaterole AS can_create_role,
              rolcanlogin AS can_login
       FROM pg_roles
       WHERE rolname NOT LIKE 'pg_%'
       ORDER BY rolname`
    );
    return rows;
  }

  async getMaterializedViews(connId, schema) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT matviewname AS name
       FROM pg_matviews
       WHERE schemaname = $1
       ORDER BY matviewname`,
      [schema]
    );
    return rows;
  }

  async getExtensions(connId) {
    const pool = this._getPool(connId);
    const { rows } = await pool.query(
      `SELECT extname AS name, extversion AS version
       FROM pg_extension
       ORDER BY extname`
    );
    return rows;
  }

  // ── Private ──────────────────────────────────────────────────

  _getPool(connId) {
    const pool = this.connections.get(connId);
    if (!pool) {
      throw new Error(`Connection "${connId}" not found`);
    }
    return pool;
  }
}

module.exports = DatabaseService;
