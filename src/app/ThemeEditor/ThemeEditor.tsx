import ColorItem from "~/app/ThemeEditor/ColorItem"
import {
    createEffect,
    For, on,
    Suspense
} from "solid-js"
import { action, createAsync, query, revalidate, useAction} from "@solidjs/router"
import {createId} from "@paralleldrive/cuid2"
import {createEventStore} from "~/packages/repository/DeltaStore"
import {ModelDelta} from "~/packages/repository/ModelDelta"
import {useReadModelStore} from "~/packages/repository/ReadModelStore"
import {ColorDefinition, ColorDelta, colorDefinitionSchema} from "~/app/ThemeEditor/ColorDefinition"
import {keyedDebounce} from "~/packages/utils/KeyedDebounce"
import {mergeDeltasAfter} from "~/packages/repository/DeltaMerger"
import useColorDatabase from "~/data/ColorModelsData"
import {useDeltaWriteModelReadUtils} from "~/packages/repository/StoreUtils"
import {zodResponse} from "~/packages/utils/ZodResponse"

const db = useColorDatabase("data")

const deltaStore = createEventStore<ColorDefinition>()
const [pushColorDefinitionEvent, { onAnyDeltaPush, getStreamById }] = deltaStore

const readModelStore = useReadModelStore(deltaStore)
const [colorDefinitions, { populate, reconcile }] = readModelStore

const {pushDeltaAndAwait} = useDeltaWriteModelReadUtils(deltaStore, readModelStore)

const colorQuery = query(async () => {
    "use server"
    const colors = await db.getColorReadModels()

    const colorList = Object.keys(colors).map(key => colors[key])
    populate(colorList)

    return colorDefinitions
}, "get-colors")

export const updateColors = action(async (delta: ModelDelta<ColorDefinition>) => {
    "use server"

    const model = await pushDeltaAndAwait(delta.modelId, delta)

    const result = await colorDefinitionSchema.spa(model)
    if (result.success) {
        await Promise.allSettled([
            db.saveColorDelta(delta),
            db.saveColorReadModel(result.data),
        ])
    }
    return zodResponse(result, { revalidate: [] })
})

export default function ThemeEditor() {

    const colors = createAsync(() => {
        return colorQuery()
    })
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
            <Suspense fallback={"Loading Colors"}>
                <div>
                    Color Length: {colors()?.length?.toString() ?? "undefined"}
                </div>
            </Suspense>
            <Suspense fallback={<div>Loading...</div>}>
                <For each={colorDefinitions}>
                    {(def) => <ColorItem definition={def} onDefinitionUpdated={onDefinitionUpdated}/>}
                </For>
            </Suspense>
            <button onClick={() => addColorLocal()}>Add</button>
            <button onClick={() => revalidate(colorQuery.key)}>Revalidate</button>
        </div>
    </div>
}