import {Model, PartialModel} from "~/packages/repository/Model"
import {createDeltaStore} from "~/packages/repository/DeltaStore"
import {createStore, reconcile} from "solid-js/store"
import {reduceDeltasOntoModel, reduceDeltasToModel} from "~/packages/repository/DeltaReducer"
import {createEvent, createKeyedEvent, EventListener, KeyedEventListener} from "~/packages/utils/EventListener"
import {ModelDelta, ModelDeltaOptionalId} from "~/packages/repository/ModelDelta"

export type ModelStore<M extends Model> = [
    modelsList: M[],
    (modelId: string, ...events: Array<ModelDeltaOptionalId<M>>) => Promise<PartialModel<M>>,
    {
        getModelById(id: string): M | undefined,
        getStreamById(id: string): ModelDelta<M>[] | undefined,
        onModelCreate: EventListener<[PartialModel<M>]>[0]
        onModelUpdate: EventListener<[PartialModel<M>]>[0]
        onModelUpdateById: KeyedEventListener<[PartialModel<M>]>[0]
    }
]

export function createModelStore<M extends Model>(initialDeltas?: Record<string, ModelDelta<M>[]>): ModelStore<M> {
    const [pushDelta, { getStreamById, onCreateDeltaPush, onUpdateDeltaPushById }] = createDeltaStore()
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

        onUpdateDeltaPushById(modelId, () => {
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
            pushDelta(key, ...initialDeltas[key])
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

    function pushDeltaAsync(modelId: string, ...events: Array<ModelDeltaOptionalId<M>>) {
        return new Promise<PartialModel<M>>((resolve, reject) => {
            onModelUpdateById(modelId, async (model) => {
                try {
                    resolve(model)
                } catch (e) {
                    reject(e)
                }
            }, { once: true })

            pushDelta(modelId, ...events)
        })
    }

    return [
        modelsListStore,
        pushDeltaAsync,
        {
            getModelById(id: string): M | undefined {
                return modelsById[id]
            },
            getStreamById,
            onModelUpdate,
            onModelUpdateById,
            onModelCreate,
        }
    ]
}
