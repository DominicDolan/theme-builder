import {ModelDelta} from "~/packages/repository/ModelDelta"
import {ColorDefinition, colorDefinitionSchema, ColorDelta} from "~/app/ThemeEditor/ColorDefinition"
import {createId} from "@paralleldrive/cuid2"
import fs from "node:fs"

const dbData = [
    {
        hex: "#123456",
        alpha: 0.5,
        name: "--test-name",
        id: createId(),
        updatedAt: Date.now()
    }
]

export function isSortedByTimestamp(deltas: ModelDelta<any>[]) {
    for (let i = 1; i < deltas.length; i++) {
        if (deltas[i - 1].timestamp > deltas[i].timestamp) {
            return false;
        }
    }
    return true;
}
export default function useColorDatabase(directory: string) {
    const deltasPath = `${directory}/colors-deltas.json`
    const readModelPath = `${directory}/colors-read-models.json`

    async function prepareDeltaWrite() {
        if (!fs.existsSync(deltasPath)) {
            await new Promise<void>((res) => fs.mkdir(directory, () => {
                fs.writeFile(deltasPath, "", () => {
                    res()
                })
            }))
        }
    }
    async function getAllDeltas() {
        if (!fs.existsSync(deltasPath)) {
            return {}
        }
        return await new Promise<Record<string, ColorDelta[]>>((resolve, reject) => {
            fs.readFile(deltasPath, (e, data) => {
                if (e) {
                    reject(e)
                } else {
                    try {
                        const json = data.toString()
                        if (json.length === 0) {
                            resolve({})
                        } else {
                            resolve(JSON.parse(data.toString()))
                        }
                    } catch (e) {
                        reject(e)
                    }
                }
            })
        })
    }

    return {
        async getColorReadModels() {
            return await new Promise<Record<string, ColorDefinition>>((resolve, reject) => {
                fs.readFile(readModelPath, (e, data) => {
                    if (e) {
                        reject({})
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
            await prepareDeltaWrite()
            const colorsDeltas = await getAllDeltas()

            if (colorsDeltas[color.modelId] == null) {
                colorsDeltas[color.modelId] = []
            }

            colorsDeltas[color.modelId].push(color)

            if (!isSortedByTimestamp(colorsDeltas[color.modelId])) {
                colorsDeltas[color.modelId] = colorsDeltas[color.modelId].sort((a, b) => a.timestamp - b.timestamp)
            }

            await new Promise<void>((resolve, reject) => {
                fs.writeFile(deltasPath, JSON.stringify(colorsDeltas), (e) => {
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
                fs.readFile(readModelPath, (e, data) => {
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
                fs.writeFile(readModelPath, JSON.stringify(colors), (e) => {
                    if (e) {
                        reject(e)
                    } else {
                        resolve()
                    }
                })
            })
        },
        async getColorDeltas() {
            return await getAllDeltas()
        }
    }
}