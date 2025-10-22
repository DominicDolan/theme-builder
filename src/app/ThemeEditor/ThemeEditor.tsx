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
import {createEventStore} from "~/packages/repository/DeltaStore"
import {ModelDelta} from "~/packages/repository/ModelDelta"
import {useReadModelStore} from "~/packages/repository/ReadModelStore"
import {sanitize, SanitizedZodResult} from "~/packages/utils/ZodSanitize"
import {ColorDefinition, ColorDelta, colorDefinitionSchema} from "~/app/ThemeEditor/ColorDefinition"
import {createStore, reconcile} from "solid-js/store"
import fs from "node:fs"
import debounce from "~/packages/utils/Debounce"



const eventStore = createEventStore<ColorDefinition>()
const [pushColorDefinitionEvent, { onAnyDeltaPush }] = eventStore

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
    },
    async saveColor(color: ModelDelta<ColorDefinition>) {
        const colorsEvents = await new Promise<Record<string, ColorDelta[]>>((resolve, reject) => {
            fs.readFile("data/colors-events.json", (e, data) => {
                if (e) {
                    resolve({})
                } else {
                    try {
                        resolve(JSON.parse(data.toString()))
                    } catch {
                        resolve({})
                    }
                }
            })
        })

        if (colorsEvents[color.modelId] == null) {
            colorsEvents[color.modelId] = []
        }

        colorsEvents[color.modelId].push(color)

        await new Promise<void>((resolve, reject) => {
            fs.writeFile("data/colors-events.json", JSON.stringify(colorsEvents), (e) => {
                if (e) {
                    reject(e)
                } else {
                    resolve()
                }
            })
        })
    }
}
const firstId = createId()
const colorQuery = query(async () => {
    "use server"
    // populate([
    //     {
    //         hex: "#123456",
    //         alpha: 0.5,
    //         name: "--test-name",
    //         id: firstId,
    //         updatedAt: Date.now()
    //     }
    // ])

    return colorDefinitions
}, "get-colors")

export const updateColors = action(async (event: ModelDelta<ColorDefinition>) => {
    "use server"
    return new Promise<SanitizedZodResult<ColorDefinition>>((resolve, reject) => {
        onModelUpdate(async (model) => {
            console.log("on model update", model)
            try {
                const result = await colorDefinitionSchema.safeParseAsync(model)
                resolve(sanitize(result))
                await db.saveColor(event)
            } catch (e) {
                reject(e)
            }
        }, { once: true })

        pushColorDefinitionEvent(event.modelId, event)
    })
})

export default function ThemeEditor() {

    const [colors, { refetch }] = createResource(() => colorQuery())
    const saveAction = useAction(updateColors)

    const save = debounce(async () => {

        await saveAction(event)
        await refetch()
    }, 300)

    onAnyDeltaPush(() => {
        save()
    })

    const [colorListStore, setColorListStore] = createStore<ColorDefinition[]>([])

    createEffect(on(colors, (value) => {
        if (value == undefined) {
            return
        }
        setColorListStore(reconcile(value))
    }))

    async function onDefinitionUpdated(e: ColorDelta) {
        await batch(async () => {
            pushColorDefinitionEvent(e.modelId, e)
        })
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
        <h2>Theme Editor</h2>
        <div flex={"col gap-4"}>
            <Suspense fallback={<div>Loading...</div>}>
                <div>Colors JSON: {JSON.stringify(colorListStore)}</div>
                <For each={colorDefinitions}>
                    {(def) => <ColorItem definition={def} onDefinitionUpdated={onDefinitionUpdated}/>}
                </For>
            </Suspense>
            <button onClick={() => addColorLocal()}>Add</button>
            <button onClick={() => revalidate(colorQuery.key)}>Revalidate</button>
        </div>
    </div>
}