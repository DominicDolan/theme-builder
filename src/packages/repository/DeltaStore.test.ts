import {expect, test} from "vitest"
import {createDeltaStore} from "./DeltaStore"
import {Model} from "./Model"

interface TestModel extends Model {
    name: string
}

test("DeltaStore stores pushed delta", () => {
    const store = createDeltaStore<TestModel>()
    const [pushDelta, { getStreamById }] = store
    const modelId = "testId-1"
    pushDelta(modelId, { modelId, timestamp: Date.now(), name: "test 1" })

    const deltaStream = getStreamById(modelId)

    expect(deltaStream?.length).toBe(1)
    expect(deltaStream?.[0].modelId).toEqual(modelId)
})

test("DeltaStore stores pushed deltas in order of timestamp", () => {
    const store = createDeltaStore<TestModel>()
    const [pushDelta, { getStreamById }] = store
    const modelId = "testId-1"

    pushDelta(modelId, { modelId, timestamp: 200, name: "middle" })
    pushDelta(modelId, { modelId, timestamp: 1000, name: "last" })
    pushDelta(modelId, { modelId, timestamp: 500, name: "middle" })
    pushDelta(modelId, { modelId, timestamp: 300, name: "middle" })
    pushDelta(modelId, { modelId, timestamp: 400, name: "middle" })
    pushDelta(modelId, { modelId, timestamp: 600, name: "middle" })
    pushDelta(modelId, { modelId, timestamp: 100, name: "first" })
    pushDelta(modelId, { modelId, timestamp: 700, name: "middle" })

    const deltaStream = getStreamById(modelId)

    const lastElement = deltaStream?.at(-1)
    const firstElement = deltaStream?.at(0)
    expect(lastElement?.modelId).toEqual(modelId)
    expect(firstElement?.modelId).toEqual(modelId)
    expect(lastElement?.name).toEqual("last")
    expect(firstElement?.name).toEqual("first")
})