import ColorItem from "~/app/ThemeEditor/ColorItem"
import {
    createEffect,
    For, on,
    Suspense
} from "solid-js"
import {action, createAsync, query, revalidate, useAction} from "@solidjs/router"
import {createId} from "@paralleldrive/cuid2"
import {defineDeltaStore} from "~/packages/repository/DeltaStore"
import {ModelDelta} from "~/packages/repository/ModelDelta"
import {createReadModelStore} from "~/packages/repository/ReadModelStore"
import {ColorDefinition, ColorDelta, colorDefinitionSchema} from "~/app/ThemeEditor/ColorDefinition"
import {keyedDebounce} from "~/packages/utils/KeyedDebounce"
import {mergeDeltasAfter} from "~/packages/repository/DeltaMerger"
import useColorDatabase from "~/data/ColorModelsData"
import {useDeltaWriteModelReadUtils} from "~/packages/repository/StoreUtils"
import {zodResponse} from "~/packages/utils/ZodResponse"
import {calculateDelta} from "~/packages/repository/DeltaGenerator"
import {squashDeltasToSingle} from "~/packages/repository/DeltaReducer"

const db = useColorDatabase("data")

const useDeltaStore = defineDeltaStore<ColorDefinition>()
// const [pushColorDefinitionEvent, { onAnyDeltaPush, getStreamById }] = deltaStore

// const readModelStore = createReadModelStore(deltaStore)
// const [colorDefinitions, { populate, reconcile }] = readModelStore
//
// const {pushDeltaAndAwait} = useDeltaWriteModelReadUtils(deltaStore, readModelStore)

const colorQuery = query(async () => {
    "use server"
    const colors = await db.getColorReadModels()

    const colorList = Object.keys(colors).map(key => colors[key])
    // populate(colorList)

    return colors
}, "get-colors")

export const updateColors = action(async (delta: ModelDelta<ColorDefinition>) => {
    "use server"

    const model = await pushDeltaAndAwait(delta.modelId, delta)

    const result = await colorDefinitionSchema.spa(model)

    if (result.success) {
        const resultDelta = calculateDelta(model, result.data)
        const deltaToSave = resultDelta == null ? delta : squashDeltasToSingle([delta, resultDelta])
        await db.saveColorDelta(deltaToSave)
    }
    return zodResponse(result, { revalidate: [] })
})

export default function ThemeEditor() {

    const [pushColorDefinitionEvent, { onAnyDeltaPush, getStreamById }] = createAsync(async () => {

        return useDeltaStore(() => colorQuery())
    })
    const colors = createAsync(() => {
        return colorQuery()
    })

    const colorDefinitionsAsync = createAsync(colorDefinitions)

    const saveAction = useAction(updateColors)

    createEffect(on(colors, (newValue) => {
        if (newValue != undefined) {
            reconcile(newValue)
        }
    }))

    const save = keyedDebounce(async (modelId: string) => {
        const lastUpdated = colors()?.find(c => c.id === modelId)?.updatedAt ?? 0

        const stream = getStreamById(modelId)

        if (stream == null) return

        const mergedDeltas = mergeDeltasAfter(stream, lastUpdated)

        if (mergedDeltas == null) return

        await saveAction(mergedDeltas)
    }, 300)

    onAnyDeltaPush((deltas) => {
        const ids = new Set(deltas.map(d => d.modelId))
        ids.forEach((id) => {
            save(id)
        })
    })

    async function onDefinitionUpdated(e: ColorDelta) {
        pushColorDefinitionEvent(e.modelId, e)
    }

    async function addColorLocal() {
        pushColorDefinitionEvent(createId(), {
            timestamp: Date.now(),
            hex: "#000000",
            alpha: 1.0,
            name: "",
        })
    }

    return <div>
        <h2>TE</h2>
        <div flex={"col gap-4"}>
            <Suspense fallback={<div style={"min-height: 20rem; min-width: 20rem; background-color: red"}>Loading...</div>}>
                <For each={colorDefinitionsAsync()}>
                    {(def) => {
                        console.log("def.name", def.name)
                        return <ColorItem definition={def} onDefinitionUpdated={onDefinitionUpdated}/>
                    }}
                </For>
            </Suspense>
            <button onClick={() => addColorLocal()}>Add</button>
            <button onClick={() => revalidate(colorQuery.key)}>Revalidate</button>
        </div>
    </div>
}