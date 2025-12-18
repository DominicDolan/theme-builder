import {expect, test, describe} from "vitest"
import {ModelDelta} from "~/data/ModelDelta"
import {reduceDeltasToModelAfter, squashDeltasToSingle} from "~/packages/repository/DeltaReducer"
import {Model} from "~/data/Model";


interface TestModel extends Model {
    name: string
}

describe("reduceDeltasAfter", () => {
    test("list of single delta with name should reduce to model", () => {
        const modelId = "someId"
        const name = "some name"
        const deltas: ModelDelta<TestModel>[] = [
            {
                modelId,
                name,
                timestamp: 100,
            }
        ]

        const model = reduceDeltasToModelAfter(deltas, 0)

        expect(model).not.toBeNull()
        expect(model?.id).toEqual(modelId)
        expect(model?.name).toEqual(name)
    })

    test("list of multiple deltas with name should reduce to model", () => {
        const modelId = "someId"
        const name = "updated name"
        const deltas: ModelDelta<TestModel>[] = [
            {
                modelId,
                timestamp: 100,
            },
            {
                modelId,
                timestamp: 200,
                name: "some name"
            },
            {
                modelId,
                timestamp: 300,
                name
            },
        ]

        const model = reduceDeltasToModelAfter(deltas, 0)

        expect(model).not.toBeNull()
        expect(model?.id).toEqual(modelId)
        expect(model?.name).toEqual(name)
    })

    test("list of deltas should only be reduced after the timestamp", () => {
        const modelId = "someId"
        const name = "updated name"
        const lastName = "some last name"
        const deltas: ModelDelta<TestModel & { lastName: string }>[] = [
            {
                modelId,
                timestamp: 100,
            },
            {
                modelId,
                timestamp: 200,
                lastName
            },
            {
                modelId,
                timestamp: 300,
                name: "initial name"
            },
            {
                modelId,
                timestamp: 300,
                name
            },
        ]

        const model = reduceDeltasToModelAfter(deltas, 250)

        expect(model).not.toBeNull()
        expect(model?.id).toEqual(modelId)
        expect(model?.name).toEqual(name)
        expect(model?.lastName).toBeUndefined()
    })
})

describe("squashDeltasToSingle", () => {
    test("Should be able to squash deltas to a single delta", () => {
        const modelId = "someId"
        const name = "updated name"
        const lastName = "some last name"
        const deltas: ModelDelta<TestModel & { lastName: string }>[] = [
            {
                modelId,
                timestamp: 100,
            },
            {
                modelId,
                timestamp: 200,
                lastName
            },
            {
                modelId,
                timestamp: 300,
                name: "initial name"
            },
            {
                modelId,
                timestamp: 300,
                name
            },
        ]


        const delta = squashDeltasToSingle(deltas)

        expect(delta).not.toBeNull()
        expect(delta?.modelId).toEqual(modelId)
        expect(delta?.name).toEqual(name)
        expect(delta?.lastName).toEqual(lastName)
    })
})
