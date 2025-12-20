import {createDeltaStore, DeltaStore} from "~/packages/repository/DeltaStore"
import {createStore, reconcile} from "solid-js/store"
import {reduceDeltasOntoModel, reduceDeltasToModel} from "~/packages/repository/DeltaReducer"
import {createEvent, createKeyedEvent, EventListener, KeyedEventListener} from "~/packages/utils/EventListener"
import {ModelDelta} from "~/data/ModelDelta"
import {Model, PartialModel} from "~/data/Model";

export type ModelStore<M extends Model> = [
    modelsList: M[],
    DeltaStore<M>[0],
    {
        getModelById(id: string): M | undefined,
        getStreamById(id: string): ModelDelta<M>[] | undefined,
        pushMany: DeltaStore<M>[1]["pushMany"]
        onModelCreate: EventListener<[PartialModel<M>]>[0]
        onModelUpdate: EventListener<[PartialModel<M>]>[0]
        onAnyDeltaPush: DeltaStore<M>[1]["onAnyDeltaPush"]
        onModelUpdateById: KeyedEventListener<[PartialModel<M>]>[0]
    }
]

export function createModelStore<M extends Model>(initialDeltas?: Record<string, ModelDelta<M>[]>): ModelStore<M> {
    const [pushDelta, { getStreamById, pushMany, onCreateDeltaPush, onUpdateDeltaPushById, onAnyDeltaPush }] = createDeltaStore()
    const [modelsById, setModelsById] = createStore<Record<string, M>>({})
    const [modelsListStore, setModelListStore] = createStore<M[]>([])

    const [onModelUpdate, triggerModelUpdate] = createEvent<[PartialModel<M>]>()
    const [onModelUpdateById, triggerModelUpdateById] = createKeyedEvent<[PartialModel<M>]>()
    const [onModelCreate, triggerModelCreate] = createEvent<[PartialModel<M>]>()
    const [onCreateDeltaPushInternal, triggerCreateDeltaPush] = createEvent<[ModelDelta<M>[]]>()

    onCreateDeltaPush((values) => {
        triggerCreateDeltaPush(values)
    })

    onCreateDeltaPushInternal((events) => {
        const modelFromEvents = reduceDeltasToModel(events)
        if (modelFromEvents == null) return

        const modelId = events[0].modelId
        setModelsById(modelFromEvents.id, modelFromEvents as M)
        triggerModelCreate(modelFromEvents)
        triggerModelUpdate(modelFromEvents)
        triggerModelUpdateById(modelId, modelFromEvents)

        onUpdateDeltaPushById(modelId, (updates) => {
            onModelUpdatedById(modelId)
        })
    })

    onModelUpdate((model) => {
        const index = modelsListStore.findIndex(m => m.id === model.id)
        if (index === -1) {
            setModelListStore(modelsListStore.length, model as M)
        } else {
            setModelListStore(index, reconcile(model as M))
        }
    })

    if (initialDeltas != null) {
        for (const key in initialDeltas) {
            pushMany(initialDeltas[key])
        }
    }

    function onModelUpdatedById(modelId: string) {
        const stream = getStreamById(modelId)
        if (stream == undefined) return

        const oldModel = modelsById[modelId]
        const newModel = reduceDeltasOntoModel(oldModel, stream)

        setModelsById(modelId, reconcile(newModel as M))
        triggerModelUpdate(newModel)
        triggerModelUpdateById(modelId, newModel)
    }

    return [
        modelsListStore,
        pushDelta,
        {
            getModelById(id: string): M | undefined {
                return modelsById[id]
            },
            pushMany,
            getStreamById,
            onModelUpdate,
            onModelUpdateById,
            onAnyDeltaPush,
            onModelCreate,
        }
    ] as ModelStore<M>
}
