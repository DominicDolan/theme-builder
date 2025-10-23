import ColorItem from "~/app/ThemeEditor/ColorItem"
import {
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
import fs from "node:fs"
import {keyedDebounce} from "~/packages/utils/KeyedDebounce"
import {mergeDeltasAfter} from "~/packages/repository/DeltaMerger"

const eventStore = createEventStore<ColorDefinition>()
const [pushColorDefinitionEvent, { onAnyDeltaPush, getStreamById }] = eventStore

const readModelStore = useReadModelStore(eventStore)
const [colorDefinitions, { onModelUpdate, populate, reconcile }] = readModelStore

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
        return await new Promise<Record<string, ColorDefinition>>((resolve, reject) => {
            fs.readFile("data/colors-read-models.json", (e, data) => {
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
    },
    async getLastUpdatedReadModel() {
        return dbData.at(-1)?.updatedAt
    },
    async saveColorDelta(color: ModelDelta<ColorDefinition>) {
        const colorsDeltas = await new Promise<Record<string, ColorDelta[]>>((resolve, reject) => {
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

        if (colorsDeltas[color.modelId] == null) {
            colorsDeltas[color.modelId] = []
        }

        colorsDeltas[color.modelId].push(color)

        await new Promise<void>((resolve, reject) => {
            fs.writeFile("data/colors-deltas.json", JSON.stringify(colorsDeltas), (e) => {
                if (e) {
                    reject(e)
                } else {
                    resolve()
                }
            })
        })
    },
    async saveColorReadModel(color: ColorDefinition) {
        const colors = await new Promise<Record<string, ColorDefinition>>((resolve, reject) => {
            fs.readFile("data/colors-read-models.json", (e, data) => {
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

        colors[color.id] = color

        await new Promise<void>((resolve, reject) => {
            fs.writeFile("data/colors-read-models.json", JSON.stringify(colors), (e) => {
                if (e) {
                    reject(e)
                } else {
                    resolve()
                }
            })
        })
    }
}

const colorQuery = query(async () => {
    "use server"
    const colors = await db.getColorReadModels()

    const colorList = Object.keys(colors).map(key => colors[key])
    populate(colorList)

    return colorDefinitions
}, "get-colors")

export const updateColors = action(async (delta: ModelDelta<ColorDefinition>) => {
    "use server"
    return new Promise<SanitizedZodResult<ColorDefinition>>((resolve, reject) => {
        onModelUpdate(async (model) => {
            try {
                const result = await colorDefinitionSchema.safeParseAsync(model)
                resolve(sanitize(result))
                if (result.success) {
                    await db.saveColorDelta(delta)
                    await db.saveColorReadModel(result.data)
                }
            } catch (e) {
                reject(e)
            }
        }, { once: true })

        pushColorDefinitionEvent(delta.modelId, delta)
    })
})

export default function ThemeEditor() {

    const [colors, { refetch }] = createResource(() => {
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
        await refetch()
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
        <h2>Theme Editor</h2>
        <div flex={"col gap-4"}>
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