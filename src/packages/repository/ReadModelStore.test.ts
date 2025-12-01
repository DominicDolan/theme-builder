import {describe, expect, test} from "vitest"
import {createReadModelStore} from "~/packages/repository/ReadModelStore"
import {defineDeltaStore} from "~/packages/repository/DeltaStore"
import {Model} from "~/packages/repository/Model"

interface TestModel extends Model {
    name: string
}

async function sleep(time: number) {
    return new Promise<void>((res) => {
        setTimeout(() => {
            res()
        }, time)
    })
}

const useDeltaStore = defineDeltaStore<TestModel>()
describe("ReadModelStore deltaStore reading", () => {
    test("Update to delta store causes ReadModelStore to update", async () => {
        const deltaStore = useDeltaStore((latestTimestamp) => Promise.resolve({}))
        const [pushDelta] = deltaStore
        const store = createReadModelStore(deltaStore)
        const [values] = store

        const modelId = "someId"
        const name = "some name"

        const readModels = values

        expect(readModels).not.toBeUndefined()
        expect(readModels?.length).toBe(0)

        pushDelta(modelId, {
            timestamp: 100,
            name
        })

        expect(readModels?.length).toBe(1)
        expect(readModels?.[0].name).toEqual(name)

    })
})
