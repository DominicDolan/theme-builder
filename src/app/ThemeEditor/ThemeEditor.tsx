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
import {squashDeltasToSingle} from "~/packages/repository/DeltaReducer"
import {createDeltaModelContextStore} from "~/packages/contextStore/DeltaModelContextStore";
import {getRequestEvent} from "solid-js/web";
import {getPlatformProxy} from "wrangler";
import {ColorDefinition, colorDefinitionSchema} from "~/data/ColorDefinition";

async function getDB() {
    const event = getRequestEvent();
    const cloudflareContext = event?.nativeEvent.context.cloudflare
    if (cloudflareContext != null) return cloudflareContext.env.DB

    const platformProxy = await getPlatformProxy()

    return platformProxy.env.DB
}

const TABLE_LIST_QUERY = "SELECT name FROM sqlite_master WHERE type='table';"

const colorQuery = query(async () => {
    "use server"

    const db = await getDB()
    const {results} = await db.prepare(TABLE_LIST_QUERY).all()

    return results.map(row => row.name)
}, "get-colors")

export const updateColors = action(async (delta: ModelDelta<ColorDefinition>) => {
    "use server"

    const deltas = []
    const [_, push] = createModelStore(deltas)

    const model = await push(delta.modelId, delta)

    const result = await colorDefinitionSchema.spa(model)

    if (result.success) {
        const resultDelta = calculateDelta(model, result.data)
        const deltaToSave = resultDelta == null ? delta : squashDeltasToSingle([delta, resultDelta])
        await Promise.resolve()//db.saveColorDelta(deltaToSave)
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
                <div>
                    Output: {String(colorDeltas())}
                </div>
                {/*<ColorProvider deltas={colorDeltas()} onDeltaPush={deltasSince(latestTimestamp(), onColorDeltaPush)}>*/}
                {/*    {(colorModels) => <div>*/}
                {/*        <For each={colorModels}>*/}
                {/*            {(def) => {*/}
                {/*                return <ColorItem definition={def}/>*/}
                {/*            }}*/}
                {/*        </For>*/}
                {/*        <ColorAddButton/>*/}
                {/*    </div>}*/}
                {/*</ColorProvider>*/}
            </Suspense>
            <button onClick={() => revalidate(colorQuery.key)}>Revalidate</button>
        </div>
    </div>
}
