import {Model, PartialModel} from "~/packages/repository/Model"
import {DeltaStore, SourceGetter} from "~/packages/repository/DeltaStore"
import {createStore, reconcile} from "solid-js/store"
import {reduceDeltasToModel, reduceDeltasToModelAfter} from "~/packages/repository/DeltaReducer"
import {createEvent, EventListener} from "~/packages/utils/EventListener"
import {createRenderEffect, on} from "solid-js"
import {ModelDelta} from "~/packages/repository/ModelDelta"


export type ReadModelStore<M extends Model> = [
    modelsList: M[],
    {
        getModelById(id: string): M | undefined,
        onModelCreate: EventListener<[PartialModel<M>]>[0]
        onModelUpdate: EventListener<[PartialModel<M>]>[0]
    }
]

export function createReadModelStore<M extends Model>(deltaStore: DeltaStore<M>): ReadModelStore<M> {
    const [_, { getStreamById, onCreateDeltaPush, onUpdateDeltaPushById, onAnyDeltaPush }] = deltaStore
    const [modelsById, setModelsById] = createStore<Record<string, M>>({})
    const [modelsListStore, setModelListStore] = createStore<M[]>([])

    const [onModelUpdate, triggerModelUpdate] = createEvent<[PartialModel<M>]>()
    const [onModelCreate, triggerModelCreate] = createEvent<[PartialModel<M>]>()
    const [onModelPopulated, triggerModelPopulate] = createEvent<[]>()
    const [onCreateDeltaPushInternal, triggerCreateDeltaPush] = createEvent<[ModelDelta<M>[]]>()

    onCreateDeltaPush((values) => {
        triggerCreateDeltaPush(values)
    })

    createRenderEffect(on((deltaStore as any)[1]._sourceGetter as SourceGetter<M>, () => {}))

    onCreateDeltaPushInternal((events) => {
        const modelFromEvents = reduceDeltasToModel(events)
        if (modelFromEvents == null) return

        const modelId = events[0].modelId
        setModelsById(modelFromEvents.id, modelFromEvents as M)
        triggerModelCreate(modelFromEvents)
        triggerModelUpdate(modelFromEvents)

        onUpdateDeltaPushById(modelId, () => {
            onModelUpdatedById(modelId)
        })
    })

    function onModelUpdatedById(modelId: string) {
        const stream = getStreamById(modelId)
        if (stream == undefined) return

        const oldModel = modelsById[modelId]
        const newUpdates = reduceDeltasToModelAfter(stream, oldModel.updatedAt)
        if (newUpdates == null) return

        setModelsById(modelId, reconcile(newUpdates as M))
        triggerModelUpdate(newUpdates)
    }


    onModelUpdate((model) => {
        const index = modelsListStore.findIndex(m => m.id === model.id)
        if (index === -1) {
            setModelListStore(modelsListStore.length, model as M)
        } else {
            setModelListStore(index, reconcile(model as M))
        }
    })

    let isDirty = true

    onAnyDeltaPush(() => {
        isDirty = true
    })

    onModelPopulated(() => {
        isDirty = false
    })

    onModelUpdate(() => {
        if (isDirty) {
            triggerModelPopulate()
            isDirty = false
        }
    })

    return [
        modelsListStore,
        {
            getModelById(id: string): M | undefined {
                return modelsById[id]
            },
            onModelUpdate,
            onModelCreate,
        }
    ]
}
