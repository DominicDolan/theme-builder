import {DeltaStore} from "~/packages/repository/DeltaStore"
import {Model, PartialModel} from "~/packages/repository/Model"
import {ReadModelStore} from "~/packages/repository/ReadModelStore"
import {ModelDeltaOptionalId} from "~/packages/repository/ModelDelta"

export function useDeltaWriteModelReadUtils<M extends Model>(deltaStore: DeltaStore<M>, readModelStore: ReadModelStore<M>) {
    const [_, { onModelUpdate }] = readModelStore
    const [pushDelta] = deltaStore

    async function pushDeltaAndAwait(modelId: string, ...events: Array<ModelDeltaOptionalId<M>>) {
        return new Promise<PartialModel<M>>((resolve, reject) => {
            onModelUpdate(async (model) => {
                try {
                    resolve(model)
                } catch (e) {
                    reject(e)
                }
            }, { once: true })

            pushDelta(modelId, ...events)
        })
    }

    return {
        pushDeltaAndAwait
    }
}
