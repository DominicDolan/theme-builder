import type {z, ZodType} from "zod"
import {Model} from "~/data/Model";

type ForeignKey = {
    column: string
    references: string // e.g. 'themes(theme_id)'
    onDelete?: "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION"
    onUpdate?: "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION"
}

type IndexDef = {
    name?: string
    columns: string[]
    unique?: boolean
}

export type ModelSqlSchemaOptions = {
    recreate?: boolean
}

/**
 * A light-weight builder for D1/SQLite CREATE TABLE statements.
 * Zod is carried for runtime validation (you can use it when reading/writing payload),
 * but SQL schema is defined by builder calls.
 */
export function createModelSchema<T extends Model>(
    tableName: string,
    payloadSchema: ZodType<T>,
    options?: ModelSqlSchemaOptions
) {
    const columns: string[] = []
    const foreignKeys: ForeignKey[] = []
    const indexes: IndexDef[] = []

    columns.push(`id INTEGER PRIMARY KEY AUTOINCREMENT`)
    columns.push(`model_id TEXT NOT NULL`)
    columns.push(`payload TEXT NOT NULL`)
    columns.push(`event_type TEXT NOT NULL`)
    columns.push(`timestamp INTEGER NOT NULL`)
    columns.push(`group_by_id TEXT NOT NULL`)

    indexes.push({ columns: ["timestamp", "group_by_id"]})
    const api = {
        addColumnRaw(sql: string) {
            columns.push(sql)
            return api
        },

        addColumn(name: string, type: "TEXT" | "INTEGER" | "REAL" | "BLOB", opts?: { notNull?: boolean }) {
            columns.push(`"${name}" ${type}${opts?.notNull ? " NOT NULL" : ""}`)
            return api
        },

        addForeignKey(
            column: string,
            references: string,
            opts?: { onDelete?: ForeignKey["onDelete"]; onUpdate?: ForeignKey["onUpdate"] },
        ) {
            foreignKeys.push({ column, references, onDelete: opts?.onDelete, onUpdate: opts?.onUpdate })
            return api
        },

        addGroupByForeignKey(references: string, opts?: { onDelete?: ForeignKey["onDelete"]; onUpdate?: ForeignKey["onUpdate"] }) {
            foreignKeys.push({ column: "group_by_id", references, onDelete: opts?.onDelete, onUpdate: opts?.onUpdate })
            return api
        },

        addIndex(columns: string | string[], opts?: { name?: string; unique?: boolean }) {
            const cols = Array.isArray(columns) ? columns : [columns]
            indexes.push({ columns: cols, name: opts?.name, unique: opts?.unique })
            return api
        },

        build() {

            return {
                tableName,
                payloadSchema,
                generateSqlSchema() {
                    const fkClauses = foreignKeys.map((fk) => {
                        const [refTable, refColWithParens] = fk.references.split("(")
                        const refCol = refColWithParens?.replace(")", "")
                        const onDelete = fk.onDelete ? ` ON DELETE ${fk.onDelete}` : ""
                        const onUpdate = fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : ""
                        return `FOREIGN KEY ("${fk.column}") REFERENCES "${refTable}"("${refCol}")${onDelete}${onUpdate}`
                    })

                    const dropTable = options?.recreate ? `DROP TABLE IF EXISTS "${tableName}";\n` : ""
                    const createTable = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${[...columns, ...fkClauses].join(",\n  ")}\n);`

                    const createIndexes = indexes.map((idx, i) => {
                        const name =
                            idx.name ??
                            `${tableName}_${idx.columns.join("_")}_${idx.unique ? "uniq" : "idx"}_${i + 1}`
                        const unique = idx.unique ? "UNIQUE " : ""
                        const cols = idx.columns.map((c) => `"${c}"`).join(", ")
                        return `CREATE ${unique}INDEX IF NOT EXISTS "${name}" ON "${tableName}" (${cols});`
                    })

                    return [dropTable + createTable, ...createIndexes].join("\n")
                },
                generateSelectGroupSql() {
                    return `SELECT * FROM "${tableName}" WHERE group_by_id = ? ORDER BY timestamp ASC;`
                },
                generateSelectSingleSql() {
                    return `SELECT * FROM "${tableName}" WHERE model_id = ? ORDER BY timestamp ASC;`
                },
                generateInsertSingle() {
                    return `INSERT INTO "${tableName}" (group_by_id, model_id, event_type, payload, timestamp) VALUES (?, ?, ?, ?, ?)`
                },
                generateInsert(valueCount: number = 1) {
                    const columns = ["group_by_id", "model_id", "event_type", "payload", "timestamp"]
                    const valueSet = `(${Array(columns.length).fill("?").join(", ")})`
                    const values = Array(valueCount).fill(valueSet).join(", ")
                    return `INSERT INTO "${tableName}" (${columns.join(", ")}) VALUES ${values}`
                }
            }
        },
    }

    return api
}

export type ModelSchema<T extends Model> = ReturnType<ReturnType<typeof createModelSchema<T>>["build"]>
