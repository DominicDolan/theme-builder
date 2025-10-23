import fs from "node:fs"
import {
    reduceGroupedDeltasToArray
} from "~/packages/repository/DeltaReducer"
import {ColorDelta} from "~/app/ThemeEditor/ColorDefinition"


export function useThemeEditorStore() {

    async function getEvents() {
        return await new Promise<Record<string, ColorDelta[]>>((resolve, reject) => {
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
    }
    async function getDefinitions() {
        const colorsEvents = await getEvents()

        return new Promise((resolve) => {
            const models = reduceGroupedDeltasToArray(colorsEvents)
            setTimeout(() => {
                resolve(models)
            }, 1000)
        })
    }

    async function updateDefinition(map: Record<string, ColorDelta>) {
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

        for (const id of Object.keys(map)) {
            if (colorsEvents[id] == null) {
                colorsEvents[id] = []
            }

            colorsEvents[id].push(map[id])
        }

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

    return {
        getDefinitions,
        updateDefinition
    }
}