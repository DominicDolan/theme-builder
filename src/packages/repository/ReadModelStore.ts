import {Model, PartialModel} from "~/packages/repository/Model"
import {Accessor, createMemo} from "solid-js"
import {EventStore} from "~/packages/repository/EventStore"
import {EventListener} from "~/packages/utils/EventListener"
import {createStore} from "solid-js/store"
import {reconcileEvents, reconcileEventsAfter} from "~/packages/repository/EventReconciler"


export type ReadModelStore<M extends Model> = [
    Accessor<M[]>,
    {
        getModelById(id: string): M | undefined,
        onModelCreate(callback: (model: PartialModel<M>) => void): void,
        onModelUpdate(callback: (model: PartialModel<M>) => void): void
    }
]

export function useReadModelStore<M extends Model>(eventStore: EventStore<M>): ReadModelStore<M> {
    const listener = new EventListener()
    const [_, { getStreamById, onCreateEventPush, onUpdateEventPushById }] = eventStore
    const [modelsById, setModels] = createStore<Record<string, M>>({})

    onCreateEventPush((events) => {
        const modelFromEvents = reconcileEvents(events)
        if (modelFromEvents == null) return

        const modelId = events[0].modelId
        setModels(modelFromEvents.id, modelFromEvents as M)
        const [model, setModel] = createStore<M>(modelsById[modelId])
        listener.trigger("model-created", modelFromEvents)

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
            listener.trigger("model-updated", model)
        })
    })

    const modelsList = createMemo(() => {
        const ids = Object.keys(modelsById)

        return ids.map(id => modelsById[id])
    })


    function onModelUpdate(callback: (model: PartialModel<M>) => void) {
        listener.on("model-updated", callback)
    }

    function onModelCreate(callback: (model: PartialModel<M>) => void) {
        listener.on("model-created", callback)
    }

    return [
        modelsList,
        {
            getModelById(id: string): M | undefined {
                return modelsById[id]
            },
            onModelUpdate,
            onModelCreate,
        }
    ]
}
