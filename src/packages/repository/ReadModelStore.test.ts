import {describe, expect, test} from "vitest"
import {createReadModelStore} from "~/packages/repository/ReadModelStore"
import {createDeltaStore} from "~/packages/repository/DeltaStore"
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

describe("ReadModelStore loading", () => {
    test("awaits initial populate of store", async () => {
        const store = createReadModelStore(createDeltaStore())
        const [values, { populate }] = store

        let result: any = null
        values().then((value) => {
            result = value
        })

        await sleep(50)

        expect(result).toBeNull

        const id = "someId"
        populate([
            {
                id,
                updatedAt: 0
            }
        ])

        await sleep(0)

        expect(result).not.toBeNull
        expect(result[0].id).toEqual(id)
    })

    test("awaits initial reconcile of store", async () => {
        const store = createReadModelStore(createDeltaStore())
        const [values, { reconcile }] = store

        let result: any = null
        values().then((value) => {
            result = value
        })

        await sleep(50)

        expect(result).toBeNull()

        const id = "someId"
        reconcile([
            {
                id,
                updatedAt: 0
            }
        ])

        await sleep(0)

        expect(result).not.toBeNull()
        expect(result[0].id).toEqual(id)
    })

    test("awaits initial push from delta store", async () => {
        const deltaStore = createDeltaStore<TestModel>()
        const [pushDelta] = deltaStore
        const store = createReadModelStore(deltaStore)
        const [values] = store

        let result: TestModel[] | undefined
        values().then((value) => {
            result = value
        })

        await sleep(50)

        expect(result).toBeUndefined()

        const id = "someId"
        const name = "some name"
        pushDelta(id, {
            timestamp: 0,
            name
        })

        await sleep(0)

        const firstResult = result?.[0]
        expect(result).not.toBeUndefined()
        expect(firstResult?.id).toEqual(id)
        expect(firstResult?.name).toEqual(name)
    })

})

describe("ReadModelStore deltaStore reading", () => {
    test("Update to delta store causes ReadModelStore to update", async () => {
        const deltaStore = createDeltaStore<TestModel>()
        const [pushDelta] = deltaStore
        const store = createReadModelStore(deltaStore)
        const [values, { populate }] = store

        const modelId = "someId"
        const name = "some name"

        populate([])

        const readModels = await values()

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
