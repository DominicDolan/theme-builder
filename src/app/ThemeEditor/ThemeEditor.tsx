import {
    createSignal,
    For,
    Suspense
} from "solid-js"
import {action, createAsync, query, revalidate, useAction, useSubmission} from "@solidjs/router"
import {ModelDelta} from "~/data/ModelDelta"
import {createModelStore} from "~/packages/repository/ModelStore"
import {keyedDebounce} from "~/packages/utils/KeyedDebounce"
import {zodResponse} from "~/packages/utils/ZodResponse"
import {calculateDelta} from "~/packages/repository/DeltaGenerator"
import {deltaArrayToGroup, squashDeltasToSingle} from "~/packages/repository/DeltaReducer"
import {createDeltaModelContextStore, deltasSince} from "~/packages/contextStore/DeltaModelContextStore";
import {getRequestEvent} from "solid-js/web";
import {getPlatformProxy} from "wrangler";
import {ColorDefinition, colorDefinitionSchema} from "~/data/ColorDefinition";
import ColorItem from "~/app/ThemeEditor/ColorItem";
import {ColorAddButton} from "~/app/ThemeEditor/ColorAddButton";
import {D1Database} from "@cloudflare/workers-types";
import colorDefinitionSql from "~/schema/ColorDefinitionSql";

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

type ColorEventRow = {
    id: number
    theme_id: string
    color_id: string
    event_type: string
    payload: string
    timestamp: number
}

function rowToColorDelta(row: ColorEventRow): ModelDelta<ColorDefinition> {
    const payload = JSON.parse(row.payload ?? "{}") as ModelDelta<ColorDefinition>["payload"]

    // Optional: validate/normalize event_type defensively
    if (row.event_type !== "create" && row.event_type !== "update" && row.event_type !== "delete") {
        throw new Error(`Unexpected event_type: ${row.event_type}`)
    }

    return {
        modelId: row.color_id,
        timestamp: Number(row.timestamp),
        type: row.event_type,
        payload,
    }
}


const colorQuery = query(async () => {
    "use server"

    const db = await getDB()

    const sql = colorDefinitionSql.deltaReadSql("theme_id = ?", "timestamp ASC")
    const {results} = await db.prepare(sql)
        .bind("1") // theme_id (hardcoded to 1 as requested)
        .all<ColorEventRow>()

    const definitions = results.map(rowToColorDelta)
    return deltaArrayToGroup(definitions)
}, "get-colors")

export const updateColors = action(async (delta: ModelDelta<ColorDefinition>) => {
    "use server"
    const existingDeltas: Record<string, ModelDelta<ColorDefinition>[]> = {}
    const [_, push] = createModelStore(existingDeltas)

    const model = push(delta.modelId, delta.payload)

    const result = await colorDefinitionSchema.spa(model)

    if (result.success) {
        const resultDelta = calculateDelta(model, result.data)
        const deltaToSave = resultDelta == null ? delta : squashDeltasToSingle([delta, resultDelta])

        if (deltaToSave) {
            const db = await getDB()
            try {
                await db.prepare(
                    "INSERT INTO color_events (theme_id, color_id, event_type, payload, timestamp) VALUES (?, ?, ?, ?, ?)"
                ).bind(
                    "1", // theme_id (hardcoded to 1 as requested)
                    deltaToSave.modelId,
                    deltaToSave.type,
                    JSON.stringify(deltaToSave.payload),
                    deltaToSave.timestamp || Date.now()
                ).run()
            } catch (e) {
                console.error("Error saving color delta:", e)
            }
        }
    }

    return zodResponse(result, { revalidate: [] })
})

export const [ColorProvider, useColorContext] = createDeltaModelContextStore<ColorDefinition>()

export default function ThemeEditor() {

    const colorDeltas = createAsync(() => colorQuery())

    const saveAction = useAction(updateColors)

    const colorsSubmission = useSubmission(updateColors)

    const [latestTimestamp, setLatestTimestamp] = createSignal(0)

    const save = keyedDebounce(async (_: string, deltas: ModelDelta<ColorDefinition>[]) => {
        const mergedDeltas = squashDeltasToSingle(deltas)

        if (mergedDeltas == null) return

        colorsSubmission.clear()
        await saveAction(mergedDeltas)

        if (colorsSubmission.result?.success && colorsSubmission.result.updatedAt > latestTimestamp()) {
            setLatestTimestamp(colorsSubmission.result.updatedAt)
        }
    }, 300)

    function onColorDeltaPush(modelId: string, deltas: ModelDelta<ColorDefinition>[]) {
        save(modelId, deltas)
    }

    return <div>
        <h2>TE</h2>
        <div flex={"col gap-4"}>
            <Suspense fallback={<div style={"min-height: 20rem; min-width: 20rem; background-color: red"}>Loading...</div>}>
                <ColorProvider deltas={colorDeltas()} onDeltaPush={deltasSince(latestTimestamp(), onColorDeltaPush)}>
                    {(colorModels) => <div>
                        <For each={colorModels}>
                            {(def) => {
                                return <ColorItem definition={def}/>
                            }}
                        </For>
                        <ColorAddButton/>
                    </div>}
                </ColorProvider>
            </Suspense>
            <button onClick={() => revalidate(colorQuery.key)}>Revalidate</button>
        </div>
    </div>
}
