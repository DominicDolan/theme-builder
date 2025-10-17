import ColorItem from "~/app/ThemeEditor/ColorItem"
import {
    batch,
    createEffect,
    createResource,
    For, on,
    Suspense
} from "solid-js"
import {action, query, revalidate, useAction} from "@solidjs/router"
import {createId} from "@paralleldrive/cuid2"
import {createEventStore} from "~/packages/repository/EventStore"
import {ModelEvent} from "~/packages/repository/ModelEvent"
import {useReadModelStore} from "~/packages/repository/ReadModelStore"
import {sanitize, SanitizedZodResult} from "~/packages/utils/ZodSanitize"
import {ColorDefinition, ColorDefinitionEvent, colorDefinitionSchema} from "~/app/ThemeEditor/ColorDefinition"
import {createStore, reconcile} from "solid-js/store"



const eventStore = createEventStore<ColorDefinition>()
const [pushColorDefinitionEvent] = eventStore

const readModelStore = useReadModelStore(eventStore)
const [colorDefinitions, { onModelUpdate, populate }] = readModelStore

const dbData = [
    {
        hex: "#123456",
        alpha: 0.5,
        name: "--test-name",
        id: createId(),
        updatedAt: Date.now()
    }
]

const db = {
    async getColorReadModels() {
        await new Promise(r => setTimeout(r, 50))
        return dbData
    },
    async getLastUpdatedReadModel() {
        return dbData.at(-1)?.updatedAt
    }
}
const firstId = createId()
const colorQuery = query(async () => {
    "use server"
    populate([
        {
            hex: "#123456",
            alpha: 0.5,
            name: "--test-name",
            id: firstId,
            updatedAt: Date.now()
        }
    ])

    return colorDefinitions()
}, "get-colors")

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
        }, { once: true })
        pushColorDefinitionEvent(event.modelId, event)
    })
})

export default function ThemeEditor() {

    const [colors, { refetch }] = createResource(() => colorQuery())
    const save = useAction(updateColors)

    const [colorListStore, setColorListStore] = createStore<ColorDefinition[]>([])

    createEffect(on(colors, (value) => {
        if (value == undefined) {
            return
        }
        setColorListStore(reconcile(value))
    }))
    async function onDefinitionUpdated(e: ColorDefinitionEvent) {
        await batch(async () => {
            pushColorDefinitionEvent(e.modelId, e)

            await save(e)
            setTimeout(() => {
            }, 0)
            await refetch()
        })
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
                <div>Colors JSON: {JSON.stringify(colorListStore)}</div>
                <For each={colorListStore}>
                    {(def) => <ColorItem definition={def} onDefinitionUpdated={onDefinitionUpdated}/>}
                </For>
            </Suspense>
            <button onClick={() => addColorLocal()}>Add</button>
            <button onClick={() => revalidate(colorQuery.key)}>Revalidate</button>
        </div>
    </div>
}