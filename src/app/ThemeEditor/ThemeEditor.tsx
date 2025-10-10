import ColorItem from "~/app/ThemeEditor/ColorItem"
import {
    For,
    Suspense
} from "solid-js"
import {action, query, revalidate, useAction} from "@solidjs/router"
import {createId} from "@paralleldrive/cuid2"
import {createEventStore} from "~/packages/repository/EventStore"
import {ModelEvent} from "~/packages/repository/ModelEvent"
import {useReadModelStore} from "~/packages/repository/ReadModelStore"
import {sanitize, SanitizedZodResult} from "~/packages/utils/ZodSanitize"
import {ColorDefinition, ColorDefinitionEvent, colorDefinitionSchema} from "~/app/ThemeEditor/ColorDefinition"


const colorQuery = query(async () => {
    return await fetch("/api/colors").then((res) => res.json())
}, "get-colors")

const eventStore = createEventStore<ColorDefinition>()
const [pushColorDefinitionEvent] = eventStore

const readModelStore = useReadModelStore(eventStore)
const [colorDefinitions, { onModelUpdate }] = readModelStore

export const updateColors = action(async (event: ModelEvent<ColorDefinition>) => {
    "use server"
    return new Promise<SanitizedZodResult<ColorDefinition>>((resolve, reject) => {
        onModelUpdate(async (model) => {
            try {
                const result = await colorDefinitionSchema.safeParseAsync(model)
                resolve(sanitize(result))
            } catch (e) {
                reject(e)
            }
        })
        pushColorDefinitionEvent(event.modelId, event)
    })
})

export default function ThemeEditor() {

    const save = useAction(updateColors)

    async function onDefinitionUpdated(e: ColorDefinitionEvent) {
        pushColorDefinitionEvent(e.modelId, e)
        await save(e)
    }

    async function addColorLocal() {
        const createEvent = pushColorDefinitionEvent(createId(), {
            timestamp: Date.now(),
            hex: "#000000",
            alpha: 1.0,
            name: "",
        })
        await save(createEvent[0])
    }


    return <div>
        <h2>Theme Editor</h2>
        <div flex={"col gap-4"}>
            <Suspense fallback={<div>Loading...</div>}>
                <For each={colorDefinitions()}>
                    {(def) => <ColorItem definition={def} onDefinitionUpdated={onDefinitionUpdated}/>}
                </For>
            </Suspense>
            <button onClick={() => addColorLocal()}>Add</button>
            {/*<button onClick={() => saveEvents()}>Save</button>*/}
            {/*<button onClick={() => refetch()}>Refetch</button>*/}
            <button onClick={() => revalidate(colorQuery.key)}>Revalidate</button>
        </div>
    </div>
}