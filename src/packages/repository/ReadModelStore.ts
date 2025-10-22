import {Model, PartialModel} from "~/packages/repository/Model"
import {DeltaStore} from "~/packages/repository/DeltaStore"
import {createStore, produce, reconcile} from "solid-js/store"
import {reduceDeltas, reduceDeltasAfter} from "~/packages/repository/EventReducer"
import {createEvent, EventListener} from "~/packages/utils/EventListener"


export type ReadModelStore<M extends Model> = [
    modelsList: M[],
    {
        getModelById(id: string): M | undefined,
        onModelCreate: EventListener<[PartialModel<M>]>[0]
        onModelUpdate: EventListener<[PartialModel<M>]>[0]
        populate(values: M[]): void
    }
]

export function useReadModelStore<M extends Model>(eventStore: DeltaStore<M>): ReadModelStore<M> {
    const [_, { getStreamById, onCreateDeltaPush, onUpdateDeltaPushById, onAnyDeltaPush }] = eventStore
    const [modelsById, setModels] = createStore<Record<string, M>>({})
    const [modelsListStore, setModelListStore] = createStore<M[]>([])

    const [onModelUpdate, triggerModelUpdate] = createEvent<[PartialModel<M>]>()
    const [onModelCreate, triggerModelCreate] = createEvent<[PartialModel<M>]>()

    function clearAll() {
        setModels(produce((models) => {
            for (const key in models) {
                delete models[key]
            }
        }))
    }

    function populate(values: M[]) {
        const contents = values.reduce((acc, v) => {
            acc[v.id] = v
            return acc
        }, {} as Record<string, M>)
        clearAll()
        setModels(contents)

        const ids = Object.keys(modelsById)

        setModelListStore(ids.map(id => modelsById[id]))
    }

    onCreateDeltaPush((events) => {
        const modelFromEvents = reduceDeltas(events)
        if (modelFromEvents == null) return

        const modelId = events[0].modelId
        setModels(modelFromEvents.id, modelFromEvents as M)
        const [model, setModel] = createStore<M>(modelsById[modelId])
        triggerModelCreate(model)
        triggerModelUpdate(model)

        onUpdateDeltaPushById(modelId, () => {
            const stream = getStreamById(modelId)
            if (stream == undefined) return

            const newUpdates = reduceDeltasAfter(stream, model.updatedAt)
            if (newUpdates == null) return

            for (const key in newUpdates) {
                if (key === "id") {
                    continue
                }
                setModel(key as any, newUpdates[key as keyof PartialModel<M>])
            }
            triggerModelUpdate(model)
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

    return [
        modelsListStore,
        {
            getModelById(id: string): M | undefined {
                return modelsById[id]
            },
            onModelUpdate,
            onModelCreate,
            populate
        }
    ]
}
