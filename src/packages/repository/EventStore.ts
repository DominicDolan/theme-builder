import {createStore} from "solid-js/store"
import {Model} from "~/packages/repository/Model"
import {ModelEvent, ModelEventOptionalId} from "~/packages/repository/ModelEvent"
import {EventListener} from "~/packages/utils/EventListener"

export type EventStore<M extends Model> = readonly [
    (modelId: string, ...events: Array<ModelEventOptionalId<M>>) => Array<ModelEvent<M>>,
    {
        getStreamById(id: string): ModelEvent<M>[] | undefined,
        onEventPush(callback: (events: ModelEvent<M>) => void): void,
        onCreateEventPush(callback: (events: ModelEvent<M>[]) => void): void,
        onUpdateEventPush(callback: (events: ModelEvent<M>[]) => void): void,
        onUpdateEventPushById(modelId: string, callback: (events: ModelEvent<M>[]) => void): void,
    }
]

export function createEventStore<M extends Model>(): EventStore<M> {
    const listener = new EventListener()

    const [eventStreams, setEventStream] = createStore<Record<string, ModelEvent<M>[]>>({})

    function pushEvent(modelId: string, ...events: Array<ModelEventOptionalId<M>>): Array<ModelEvent<M>> {
        const stream = eventStreams[modelId] as ModelEvent<M>[] | null
        const eventsWithId: ModelEvent<M>[] = events.map(e => ({...e, modelId} as ModelEvent<M>))
        if (stream == null) {
            setEventStream(modelId, eventsWithId)
            listener.trigger("create-event-pushed", eventsWithId)
        } else {
            for (const event of eventsWithId) {
                setEventStream(modelId, stream.length ?? 0, event)
            }
            listener.trigger("update-event-pushed", eventsWithId)
            listener.trigger(`update-event-pushed-${modelId}`, eventsWithId)
        }
        listener.trigger("events-pushed", eventsWithId)
        return eventsWithId
    }

    function onEventPush(callback: (events: ModelEvent<M>) => void) {
        listener.on("events-pushed", callback)
    }

    function onCreateEventPush(callback: (events: ModelEvent<M>[]) => void) {
        listener.on("create-event-pushed", callback)
    }

    function onUpdateEventPush(callback: (events: ModelEvent<M>[]) => void) {
        listener.on("update-event-pushed", callback)
    }

    function onUpdateEventPushById(modelId: string, callback: (events: ModelEvent<M>[]) => void) {
        listener.on(`update-event-pushed-${modelId}`, callback)
    }

    return [
        pushEvent,
        {
            getStreamById(id: string): ModelEvent<M>[] | undefined {
                return eventStreams[id]
            },
            onEventPush,
            onCreateEventPush,
            onUpdateEventPush,
            onUpdateEventPushById,
        }
    ] as const
}
