import {afterAll, beforeAll, expect, test} from "vitest"
import useColorDatabase from "./ColorModelsData"
import fs from "node:fs"
import {createId} from "@paralleldrive/cuid2"


const testDataDirectory = "testData"
function getIndividualDirectory() {
    return `${testDataDirectory}/${createId()}`
}


async function removeTestFiles() {
    await new Promise<void>((res, rej) => {
        fs.rm(testDataDirectory, { recursive: true, force: true }, () => {
            fs.mkdir(testDataDirectory, () => {
                res()
            })
        })
    })
}

beforeAll(async () => {
    await removeTestFiles()
})

afterAll(async () => {
    await removeTestFiles()
})

test("saving color succeeds without error", async () => {

    const db = useColorDatabase(getIndividualDirectory())
    const modelId = createId()
    await db.saveColorDelta({
        modelId,
        timestamp: Date.now(),
        name: "--test-name",
        alpha: 1.0,
    })
})

test("saving color can be retrieved again", async () => {
    const db = useColorDatabase(getIndividualDirectory())
    const modelId = createId()
    const name = "--test-name"
    await db.saveColorDelta({
        modelId,
        name,
        timestamp: Date.now(),
    })

    const colors = await db.getColorDeltas()

    expect(colors[modelId]).not.toBeUndefined()
    expect(colors[modelId].length).toBe(1)
    expect(colors[modelId][0].name).toBe(name)
})

test("saving multiple colors can be retrieved again", async () => {
    const db = useColorDatabase(getIndividualDirectory())
    const modelId = createId()
    const name = "--test-name"

    for (let i = 0; i < 10; i++) {
        await db.saveColorDelta({
            modelId,
            name: `${name}-${i}`,
            timestamp: Date.now(),
        })
    }

    const colors = await db.getColorDeltas()

    expect(colors[modelId]).not.toBeUndefined()
    expect(colors[modelId].length).toBe(10)
})

test("multiple colors are saved in order of timestamp", async () => {
    const db = useColorDatabase(getIndividualDirectory())
    const modelId = createId()
    const name = "--test-name"

    await db.saveColorDelta({
        modelId,
        name: `${name}-${1}`,
        timestamp: 1,
    })
    await db.saveColorDelta({
        modelId,
        name: `${name}-${3}`,
        timestamp: 3,
    })
    await db.saveColorDelta({
        modelId,
        name: `${name}-${2}`,
        timestamp: 2,
    })

    const colors = await db.getColorDeltas()

    expect(colors[modelId]).not.toBeUndefined()
    expect(colors[modelId].length).toBe(3)
    expect(colors[modelId][0].timestamp).toBe(1)
    expect(colors[modelId][1].timestamp).toBe(2)
    expect(colors[modelId][2].timestamp).toBe(3)
})