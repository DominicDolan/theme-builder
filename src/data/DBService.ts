import {Model, ModelData} from "~/data/Model";
import {ModelSchema} from "~/data/ModelSchemaBuilder";
import {getRequestEvent} from "solid-js/web";
import {getPlatformProxy} from "wrangler";
import {ModelDelta} from "~/data/ModelDelta";

async function getDB(): Promise<D1Database> {
    const event = getRequestEvent();
    const cloudflareContext = event?.nativeEvent.context.cloudflare
    if (cloudflareContext != null) return cloudflareContext.env.DB

    const platformProxy = await getPlatformProxy()

    if (platformProxy.env.DB == null) {
        throw new Error("DB not found in env. Tried Cloudflare context and Wrangler platform proxy.")
    }
    return platformProxy.env.DB as D1Database
}

type ModelEventRow = {
    id: string
    model_id: string
    event_type: string
    payload: string
    timestamp: number
}

function convertEventRowToModelDelta<M extends Model>(row: ModelEventRow): ModelDelta<M> {
    return {
        modelId: row.model_id,
        type: row.event_type as ModelDelta<M>["type"],
        payload: JSON.parse(row.payload) as ModelData<M>,
        timestamp: row.timestamp
    }
}

export type ModelSqlQueries<M extends Model> = {
    getMany: (table: string) => string
    getOne: (table: string, id: string) => string
    insert: (table: string, delta: ModelDelta<M>) => string
}

export function createDBService<M extends Model >(sqlSchema: ModelSchema<M>, queries: ModelSqlQueries<M>) {

    return {
        getMany: async () => {
            const db = await getDB()

            const sql = queries.getMany(sqlSchema.tableName)
            const {results} = await db.prepare(sql)
                .bind("1") // theme_id (hardcoded to 1 as requested)
                .all<ModelEventRow>()

            return results.map(convertEventRowToModelDelta)
        },
        getOne: async (id: string) => {
            const db = await getDB()

            const sql = queries.getOne(sqlSchema.tableName, id)
            const {results} = await db.prepare(sql).all<ModelEventRow>()

            return results.map(convertEventRowToModelDelta)[0]
        },
        insert: async (delta: ModelDelta<M>) => {

        }
    }
}
