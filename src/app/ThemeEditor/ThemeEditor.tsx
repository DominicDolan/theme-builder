import ColorItem from "~/app/ThemeEditor/ColorItem"
import {
    For,
    Suspense
} from "solid-js"
import {action, createAsync, query, revalidate, useAction, useSubmission} from "@solidjs/router"
import {createId} from "@paralleldrive/cuid2"
import {createDeltaStore} from "~/packages/repository/DeltaStore"
import {ModelDelta} from "~/packages/repository/ModelDelta"
import {createModelStore} from "~/packages/repository/ModelStore"
import {ColorDefinition, colorDefinitionSchema, ColorDeltaOptional} from "~/app/ThemeEditor/ColorDefinition"
import {keyedDebounce} from "~/packages/utils/KeyedDebounce"
import {mergeDeltasAfter} from "~/packages/repository/DeltaMerger"
import useColorDatabase from "~/data/ColorModelsData"
import {zodResponse} from "~/packages/utils/ZodResponse"
import {calculateDelta} from "~/packages/repository/DeltaGenerator"
import {squashDeltasToSingle} from "~/packages/repository/DeltaReducer"

const db = useColorDatabase("data")

const colorQuery = query(async () => {
    "use server"

    return db.getColorDeltas()
}, "get-colors")

export const updateColors = action(async (delta: ModelDelta<ColorDefinition>) => {
    "use server"
    const [_, push] = createModelStore()

    const model = await push(delta.modelId, delta)

    const result = await colorDefinitionSchema.spa(model)

    if (result.success) {
        const resultDelta = calculateDelta(model, result.data)
        const deltaToSave = resultDelta == null ? delta : squashDeltasToSingle([delta, resultDelta])
        await db.saveColorDelta(deltaToSave)
    }
    return zodResponse(result, { revalidate: [] })
})

export default function ThemeEditor() {

    const [colors, pushColorDefinitionEvent, { getStreamById, onModelUpdate }] = createModelStore<ColorDefinition>()

    const saveAction = useAction(updateColors)

    const colorsSubmission = useSubmission(updateColors)

    let latestTimestamp = 0
    const getLatestTimestamp = () => {
        if (!colorsSubmission.result?.success) {
            return latestTimestamp
        } else if (colorsSubmission.result.updatedAt < latestTimestamp) {
            return latestTimestamp
        }
        latestTimestamp = colorsSubmission.result.updatedAt
        return latestTimestamp
    }

    const save = keyedDebounce(async (modelId: string) => {
        const lastUpdated = getLatestTimestamp()

        const stream = getStreamById(modelId)

        if (stream == null) return

        const mergedDeltas = mergeDeltasAfter(stream, lastUpdated)

        if (mergedDeltas == null) return

        colorsSubmission.clear()
        await saveAction(mergedDeltas)
    }, 300)

    onModelUpdate((model) => {
        save(model.id)
    })

    async function onDefinitionUpdated(modelId: string, e: ColorDeltaOptional) {
        pushColorDefinitionEvent(modelId, e)
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
                <For each={colors}>
                    {(def) => {
                        return <ColorItem definition={def} onDefinitionUpdated={onDefinitionUpdated.bind(undefined, def.id)}/>
                    }}
                </For>
            </Suspense>
            <button onClick={() => addColorLocal()}>Add</button>
            <button onClick={() => revalidate(colorQuery.key)}>Revalidate</button>
        </div>
    </div>
}