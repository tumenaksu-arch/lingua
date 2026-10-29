import type { Database, SqlParams, SqlValue } from '../local/database';

type Row = Record<string, SqlValue>;

const PKS: Record<string, string[]> = {
  user_stats: ['user_id'],
  user_progress: ['user_id', 'lesson_id'],
  srs_cards: ['user_id', 'vocab_id'],
  mistakes: ['user_id', 'course_id', 'exercise_id'],
  events: ['id'],
  sync_meta: ['key'],
  courses: ['id'], units: ['id'], lessons: ['id'], exercises: ['id'], vocab: ['id'],
};

/**
 * Tiny in-memory stand-in for expo-sqlite that understands only the SQL
 * shapes used by src/data (INSERT ... ON CONFLICT upserts, simple SELECT /
 * UPDATE / DELETE with `col = ?`, `col <= ?`, `col IN (...)`, ORDER BY, LIMIT).
 * Transactions snapshot the tables and roll back on throw.
 */
export class FakeDb implements Database {
  tables: Record<string, Row[]> = {};
  private seq = 0;

  private t(name: string): Row[] {
    return (this.tables[name] ??= []);
  }

  async exec(): Promise<void> {}

  async run(sql: string, params: SqlParams = []): Promise<void> {
    const s = sql.replace(/\s+/g, ' ').trim();
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^INSERT (?:OR (REPLACE|IGNORE) )?INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)(?: ON CONFLICT\(([^)]+)\) DO UPDATE SET (.+))?$/i))) {
      const [, mode, table, colsStr] = m;
      const cols = colsStr.split(',').map((c) => c.trim());
      const row: Row = {};
      cols.forEach((c, i) => (row[c] = params[i] ?? null));
      const pk = PKS[table] ?? ['id'];
      const rows = this.t(table);
      const idx = rows.findIndex((r) => pk.every((k) => r[k] === row[k]));
      if (table === 'outbox') { row.id = ++this.seq; row.attempts = 0; }
      if (idx === -1) rows.push(row);
      else if (mode?.toUpperCase() === 'IGNORE') return;
      else rows[idx] = { ...rows[idx], ...row };
      return;
    }
    if ((m = s.match(/^DELETE FROM (\w+) WHERE (.+)$/i))) {
      const pred = this.where(m[2], params);
      this.tables[m[1]] = this.t(m[1]).filter((r) => !pred(r));
      return;
    }
    if ((m = s.match(/^UPDATE (\w+) SET (.+) WHERE (.+)$/i))) {
      const [, table, setStr, whereStr] = m;
      // Split on the FIRST '=' only, so `col = col + 1` keeps its increment expression.
      const parts = setStr.split(',').map((a) => {
        const eq = a.indexOf('=');
        return [a.slice(0, eq).trim(), a.slice(eq + 1).trim()] as [string, string];
      });
      // `col = ?` assignments consume params left-to-right, before the WHERE params.
      let i = 0;
      const assigns: [string, SqlValue][] = [];
      for (const [col, expr] of parts) {
        if (expr === '?') assigns.push([col, params[i++] ?? null]);
      }
      const pred = this.where(whereStr, params.slice(i));
      for (const r of this.t(table)) {
        if (!pred(r)) continue;
        for (const [col, v] of assigns) r[col] = v;
        for (const [col, expr] of parts) {
          if (/\+ 1$/.test(expr)) r[col] = (Number(r[col]) || 0) + 1;
        }
      }
      return;
    }
    throw new Error(`FakeDb.run: unsupported SQL: ${s}`);
  }

  async getFirst<T>(sql: string, params: SqlParams = []): Promise<T | null> {
    const rows = await this.getAll<T>(sql, params);
    return rows[0] ?? null;
  }

  async getAll<T>(sql: string, params: SqlParams = []): Promise<T[]> {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (/^PRAGMA user_version$/i.test(s)) return [{ user_version: 0 } as T];
    const m = s.match(/^SELECT (.+?) FROM (\w+)(?: WHERE (.+?))?(?: ORDER BY (\w+) (ASC|DESC)(?:, ?(\w+) (ASC|DESC))?)?(?: LIMIT \?)?$/i);
    if (!m) throw new Error(`FakeDb.getAll: unsupported SQL: ${s}`);
    const [, select, table, whereStr, orderCol, dir, orderCol2, dir2] = m;
    const limit = /LIMIT \?$/i.test(s) ? Number(params[params.length - 1]) : Infinity;
    let rows = this.t(table).filter(whereStr ? this.where(whereStr, params) : () => true);
    if (orderCol) {
      const d1 = dir!.toUpperCase() === 'DESC' ? -1 : 1;
      rows = [...rows].sort((a, b) => {
        const first = (Number(a[orderCol]) - Number(b[orderCol])) * d1;
        if (first !== 0 || !orderCol2) return first;
        const d2 = dir2!.toUpperCase() === 'DESC' ? -1 : 1;
        return (Number(a[orderCol2]) - Number(b[orderCol2])) * d2;
      });
    }
    rows = rows.slice(0, limit);
    if (/^COUNT\(\*\) AS n$/i.test(select)) return [{ n: rows.length } as T];
    if (select === '*') return rows.map((r) => ({ ...r }) as T);
    const cols = select.split(',').map((c) => c.trim());
    return rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])) as T);
  }

  /** Supports `a = ? AND b <= ?`, `id IN (?,?)` and `col LIKE ?` (prefix%). Params are consumed left to right. */
  private where(expr: string, params: SqlParams): (r: Row) => boolean {
    let i = 0;
    const clauses = expr.split(/ AND /i).map((c) => {
      let m: RegExpMatchArray | null;
      if ((m = c.match(/^(\w+) IN \(([?,\s]+)\)$/i))) {
        const n = m[2].split(',').length;
        const vals = params.slice(i, i + n);
        i += n;
        const col = m[1];
        return (r: Row) => vals.includes(r[col]);
      }
      if ((m = c.match(/^(\w+) LIKE \?$/i))) {
        const col = m[1];
        const pattern = String(params[i++]);
        const prefix = pattern.endsWith('%') ? pattern.slice(0, -1) : pattern;
        return (r: Row) => typeof r[col] === 'string' && (r[col] as string).startsWith(prefix);
      }
      if ((m = c.match(/^(\w+) (=|<=|>|<)\s*\?$/))) {
        const [, col, op] = m;
        const v = params[i++];
        return (r: Row) => {
          const x = r[col];
          if (op === '=') return x === v;
          if (x === null || v === null) return false;
          return op === '<=' ? x <= v : op === '>' ? x > v : x < v;
        };
      }
      throw new Error(`FakeDb.where: unsupported clause: ${c}`);
    });
    return (r) => clauses.every((c) => c(r));
  }

  async transaction(task: () => Promise<void>): Promise<void> {
    const snapshot = JSON.stringify(this.tables);
    const seq = this.seq;
    try {
      await task();
    } catch (e) {
      this.tables = JSON.parse(snapshot);
      this.seq = seq;
      throw e;
    }
  }
}
