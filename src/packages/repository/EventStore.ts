import {createStore} from "solid-js/store"
import {Model} from "~/packages/repository/Model"
import {ModelEvent, ModelEventOptionalId} from "~/packages/repository/ModelEvent"
import {createEvent, createKeyedEvent, EventListener, KeyedEventListener} from "~/packages/utils/EventListener"

export type EventStore<M extends Model> = readonly [
    (modelId: string, ...events: Array<ModelEventOptionalId<M>>) => Array<ModelEvent<M>>,
    {
        getStreamById(id: string): ModelEvent<M>[] | undefined,
        onAnyEventPush: EventListener<[ModelEvent<M>[]], void>[0]
        onAnyEventPushById: KeyedEventListener<[ModelEvent<M>[]], void>[0]
        onCreateEventPush: EventListener<[ModelEvent<M>[]], void>[0]
        onCreateEventPushById: KeyedEventListener<[ModelEvent<M>[]], void>[0]
        onUpdateEventPush: EventListener<[ModelEvent<M>[]], void>[0]
        onUpdateEventPushById: KeyedEventListener<[ModelEvent<M>[]], void>[0]
    }
]

export function createEventStore<M extends Model>(): EventStore<M> {
    // const listener = new EventListener()

    const [eventStreams, setEventStream] = createStore<Record<string, ModelEvent<M>[]>>({})

    const [onAnyEventPush, triggerAnyEventPush] = createEvent<[ModelEvent<M>[]]>()
    const [onAnyEventPushById, triggerAnyEventPushById] = createKeyedEvent<[ModelEvent<M>[]]>()
    const [onUpdateEventPush, triggerUpdateEventPush] = createEvent<[ModelEvent<M>[]]>()
    const [onUpdateEventPushById, triggerUpdateEventPushById] = createKeyedEvent<[ModelEvent<M>[]]>()
    const [onCreateEventPush, triggerCreateEventPush] = createEvent<[ModelEvent<M>[]]>()
    const [onCreateEventPushById, triggerCreateEventPushById] = createKeyedEvent<[ModelEvent<M>[]]>()

    function pushEvent(modelId: string, ...events: Array<ModelEventOptionalId<M>>): Array<ModelEvent<M>> {
        const stream = eventStreams[modelId] as ModelEvent<M>[] | null
        const eventsWithId: ModelEvent<M>[] = events.map(e => ({...e, modelId} as ModelEvent<M>))
        if (stream == null) {
            setEventStream(modelId, eventsWithId)
            triggerCreateEventPush(eventsWithId)
            triggerCreateEventPushById(modelId, eventsWithId)
        } else {
            for (const event of eventsWithId) {
                setEventStream(modelId, stream.length ?? 0, event)
            }
            triggerUpdateEventPush(eventsWithId)
            triggerUpdateEventPushById(modelId, eventsWithId)
        }
        triggerAnyEventPush(eventsWithId)
        triggerAnyEventPushById(modelId, eventsWithId)
        return eventsWithId
    }

    return [
        pushEvent,
        {
            getStreamById(id: string): ModelEvent<M>[] | undefined {
                return eventStreams[id]
            },
            onAnyEventPush,
            onAnyEventPushById,
            onCreateEventPush,
            onCreateEventPushById,
            onUpdateEventPush,
            onUpdateEventPushById,
        }
    ] as const
}
