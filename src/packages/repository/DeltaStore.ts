import {createStore} from "solid-js/store"
import {Model} from "~/packages/repository/Model"
import {ModelDelta, ModelDeltaOptionalId} from "~/packages/repository/ModelDelta"
import {createEvent, createKeyedEvent, EventListener, KeyedEventListener} from "~/packages/utils/EventListener"

export type DeltaStore<M extends Model> = readonly [
    (modelId: string, ...events: Array<ModelDeltaOptionalId<M>>) => Array<ModelDelta<M>>,
    {
        getStreamById(id: string): ModelDelta<M>[] | undefined,
        onAnyDeltaPush: EventListener<[ModelDelta<M>[]], void>[0]
        onAnyDeltaPushById: KeyedEventListener<[ModelDelta<M>[]], void>[0]
        onCreateDeltaPush: EventListener<[ModelDelta<M>[]], void>[0]
        onCreateDeltaPushById: KeyedEventListener<[ModelDelta<M>[]], void>[0]
        onUpdateDeltaPush: EventListener<[ModelDelta<M>[]], void>[0]
        onUpdateDeltaPushById: KeyedEventListener<[ModelDelta<M>[]], void>[0]
    }
]

export function createEventStore<M extends Model>(): DeltaStore<M> {
    const [deltaStreams, setDeltaStream] = createStore<Record<string, ModelDelta<M>[]>>({})

    const [onAnyDeltaPush, triggerAnyDeltaPush] = createEvent<[ModelDelta<M>[]]>()
    const [onAnyDeltaPushById, triggerAnyDeltaPushById] = createKeyedEvent<[ModelDelta<M>[]]>()
    const [onUpdateDeltaPush, triggerUpdateDeltaPush] = createEvent<[ModelDelta<M>[]]>()
    const [onUpdateDeltaPushById, triggerUpdateDeltaPushById] = createKeyedEvent<[ModelDelta<M>[]]>()
    const [onCreateDeltaPush, triggerCreateDeltaPush] = createEvent<[ModelDelta<M>[]]>()
    const [onCreateDeltaPushById, triggerCreateDeltaPushById] = createKeyedEvent<[ModelDelta<M>[]]>()

    function pushEvent(modelId: string, ...events: Array<ModelDeltaOptionalId<M>>): Array<ModelDelta<M>> {
        const stream = deltaStreams[modelId] as ModelDelta<M>[] | null
        const eventsWithId: ModelDelta<M>[] = events.map(e => ({...e, modelId} as ModelDelta<M>))
        if (stream == null) {
            setDeltaStream(modelId, eventsWithId)
            triggerCreateDeltaPush(eventsWithId)
            triggerCreateDeltaPushById(modelId, eventsWithId)
        } else {
            for (const event of eventsWithId) {
                setDeltaStream(modelId, stream.length ?? 0, event)
            }
            triggerUpdateDeltaPush(eventsWithId)
            triggerUpdateDeltaPushById(modelId, eventsWithId)
        }
        triggerAnyDeltaPush(eventsWithId)
        triggerAnyDeltaPushById(modelId, eventsWithId)
        return eventsWithId
    }

    return [
        pushEvent,
        {
            getStreamById(id: string): ModelDelta<M>[] | undefined {
                return deltaStreams[id]
            },
            onAnyDeltaPush,
            onAnyDeltaPushById,
            onCreateDeltaPush,
            onCreateDeltaPushById,
            onUpdateDeltaPush,
            onUpdateDeltaPushById,
        }
    ] as const
}
