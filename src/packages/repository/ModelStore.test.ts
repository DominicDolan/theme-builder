import {describe, expect, test} from "vitest"
import {createModelStore} from "~/packages/repository/ModelStore"
import {Model} from "~/packages/repository/Model"

interface TestModel extends Model {
    name: string
    age: number
}

async function sleep(time: number) {
    return new Promise<void>((res) => {
        setTimeout(() => {
            res()
        }, time)
    })
}

describe("ReadModelStore deltaStore reading", () => {
    test("Update to delta store causes ReadModelStore to update", async () => {
        const store = createModelStore<TestModel>()
        const [values, pushDelta] = store

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

    test("Updating 2 properties separately causes ReadModelStore to update", async () => {
        const store = createModelStore<TestModel>()
        const [values, pushDelta] = store

        const modelId = "someId"
        const name = "some name"
        const age = 21

        const readModels = values

        expect(readModels).not.toBeUndefined()
        expect(readModels?.length).toBe(0)

        pushDelta(modelId, {
            timestamp: 100,
            name
        })

        expect(readModels?.length).toBe(1)

        pushDelta(modelId, {
            timestamp: 200,
            age
        })

        expect(readModels?.length).toBe(1)
        expect(readModels?.[0].name).toEqual(name)
        expect(readModels?.[0].age).toEqual(age)

    })
})
