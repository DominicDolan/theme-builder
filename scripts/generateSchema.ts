import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { pathToFileURL } from "node:url"

type SqlGeneratable = {
    generateSqlSchema: () => string
}

const SCHEMAS_DIR = path.resolve(process.cwd(), "src/schema")
const MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations")
const GENERATED_SUFFIX = "_generated.sql"

function sha256(text: string) {
    return crypto.createHash("sha256").update(text).digest("hex")
}

function isSqlGeneratable(x: unknown): x is SqlGeneratable {
    return (
        typeof x === "object" &&
        x !== null &&
        "generateSqlSchema" in x &&
        typeof (x as any).generateSqlSchema === "function"
    )
}

function walk(dir: string): string[] {
    const out: string[] = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) out.push(...walk(full))
        else out.push(full)
    }
    return out
}

function listMigrationFiles() {
    if (!fs.existsSync(MIGRATIONS_DIR)) return []
    return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()
}

function nextMigrationNumber(files: string[]) {
    let max = 0
    for (const f of files) {
        const m = f.match(/^(\d+)_/)
        if (!m) continue
        max = Math.max(max, Number(m[1]))
    }
    return max + 1
}

function latestGeneratedMigration(files: string[]) {
    const generated = files.filter((f) => f.endsWith(GENERATED_SUFFIX)).sort()
    return generated.length ? generated[generated.length - 1] : null
}

async function loadSchemaModulesFromDir(dir: string) {
    if (!fs.existsSync(dir)) {
        throw new Error(`Schema directory does not exist: ${dir}`)
    }

    const files = walk(dir)
        .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
        .filter((f) => !f.endsWith(".d.ts"))

    const loaded: Array<{ file: string; sql: string }> = []

    for (const file of files) {
        // Skip obvious non-modules if you want; leaving simple for now.
        const url = pathToFileURL(file).href
        const mod = await import(url)

        const def = mod?.default as unknown
        if (!def) continue

        if (!isSqlGeneratable(def)) {
            throw new Error(
                `Default export in ${path.relative(process.cwd(), file)} does not have generateSqlSchema(): string`
            )
        }

        loaded.push({
            file,
            sql: def.generateSqlSchema(),
        })
    }

    // stable order so output is deterministic
    loaded.sort((a, b) => a.file.localeCompare(b.file))
    return loaded
}

function buildMigrationSql(loaded: Array<{ file: string; sql: string }>) {
    const header = [
        "-- Generated migration file. Do not edit by hand.",
        `-- Generated at: ${new Date().toISOString()}`,
        `-- Source directory: ${path.relative(process.cwd(), SCHEMAS_DIR)}`,
        "",
    ].join("\n")

    const body = loaded
        .map((x) => {
            const rel = path.relative(process.cwd(), x.file)
            return `-- Source: ${rel}\n${x.sql.trim()}`
        })
        .join("\n\n")

    return `${header}\n${body}\n`
}

async function main() {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true })

    const loaded = await loadSchemaModulesFromDir(SCHEMAS_DIR)
    if (loaded.length === 0) {
        console.log(`No schema modules found in ${SCHEMAS_DIR}`)
        return
    }

    const sql = buildMigrationSql(loaded)
    const sqlHash = sha256(sql)

    const migrationFiles = listMigrationFiles()
    const latestGenerated = latestGeneratedMigration(migrationFiles)

    if (latestGenerated) {
        const latestContents = fs.readFileSync(path.join(MIGRATIONS_DIR, latestGenerated), "utf8")
        if (sha256(latestContents) === sqlHash) {
            console.log(`No changes. Latest generated migration (${latestGenerated}) already matches.`)
            return
        }
    }

    const n = nextMigrationNumber(migrationFiles)
    const filename = `${String(n).padStart(4, "0")}_generated.sql`
    const outPath = path.join(MIGRATIONS_DIR, filename)
    fs.writeFileSync(outPath, sql, "utf8")

    console.log(`Wrote ${path.relative(process.cwd(), outPath)}`)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
