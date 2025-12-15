import ColorItem from "~/app/ThemeEditor/ColorItem"
import {
    createSignal,
    For,
    Suspense
} from "solid-js"
import {action, createAsync, query, revalidate, useAction, useSubmission} from "@solidjs/router"
import {ModelDelta} from "~/packages/repository/ModelDelta"
import {createModelStore} from "~/packages/repository/ModelStore"
import {ColorDefinition, colorDefinitionSchema, ColorDeltaOptional} from "~/app/ThemeEditor/ColorDefinition"
import {keyedDebounce} from "~/packages/utils/KeyedDebounce"
import useColorDatabase from "~/data/ColorModelsData"
import {zodResponse} from "~/packages/utils/ZodResponse"
import {calculateDelta} from "~/packages/repository/DeltaGenerator"
import {squashDeltasToSingle} from "~/packages/repository/DeltaReducer"
import {createDeltaModelContextStore, deltasSince} from "~/packages/contextStore/DeltaModelContextStore";
import {ColorAddButton} from "~/app/ThemeEditor/ColorAddButton";

const db = useColorDatabase("data")

const colorQuery = query(async () => {
    "use server"

    return db.getColorDeltas()
}, "get-colors")

export const updateColors = action(async (delta: ModelDelta<ColorDefinition>) => {
    "use server"
    const deltas = await db.getColorDeltas()
    const [_, push] = createModelStore(deltas)

    const model = await push(delta.modelId, delta)

    const result = await colorDefinitionSchema.spa(model)

    if (result.success) {
        const resultDelta = calculateDelta(model, result.data)
        const deltaToSave = resultDelta == null ? delta : squashDeltasToSingle([delta, resultDelta])
        await db.saveColorDelta(deltaToSave)
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
