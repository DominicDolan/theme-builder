import {Model, PartialModel} from "~/packages/repository/Model"
import {Accessor} from "solid-js"
import {EventStore} from "~/packages/repository/EventStore"
import {createStore, produce} from "solid-js/store"
import {reconcileEvents, reconcileEventsAfter} from "~/packages/repository/EventReconciler"
import {createEvent, EventListener} from "~/packages/utils/EventListener"


export type ReadModelStore<M extends Model> = [
    Accessor<M[]>,
    {
        getModelById(id: string): M | undefined,
        onModelCreate: EventListener<[PartialModel<M>]>[0]
        onModelUpdate: EventListener<[PartialModel<M>]>[0]
        populate(values: M[]): void
    }
]

export function useReadModelStore<M extends Model>(eventStore: EventStore<M>): ReadModelStore<M> {
    const [_, { getStreamById, onCreateEventPush, onUpdateEventPushById }] = eventStore
    const [modelsById, setModels] = createStore<Record<string, M>>({})

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
    }

    onCreateEventPush((events) => {
        const modelFromEvents = reconcileEvents(events)
        if (modelFromEvents == null) return

        const modelId = events[0].modelId
        setModels(modelFromEvents.id, modelFromEvents as M)
        const [model, setModel] = createStore<M>(modelsById[modelId])
        triggerModelUpdate(model)
        triggerModelCreate(model)

        onUpdateEventPushById(modelId, () => {
            const stream = getStreamById(modelId)
            if (stream == undefined) return

            const newUpdates = reconcileEventsAfter(stream, model.updatedAt)
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

    const modelsList = () => {
        const ids = Object.keys(modelsById)

        return ids.map(id => modelsById[id])
    }

    return [
        modelsList,
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
