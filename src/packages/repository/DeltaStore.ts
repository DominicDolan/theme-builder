import {createStore, produce} from "solid-js/store"
import {Model} from "~/packages/repository/Model"
import {ModelDelta, ModelDeltaOptionalId} from "~/packages/repository/ModelDelta"
import {createEvent, createKeyedEvent, EventListener, KeyedEventListener} from "~/packages/utils/EventListener"

export type DeltaStore<M extends Model> = readonly [
    (modelId: string, ...events: Array<ModelDeltaOptionalId<M>>) => Array<ModelDelta<M>>,
    {
        getStreamById(id: string): ModelDelta<M>[] | undefined,
        onAnyDeltaPush: EventListener<[ModelDelta<M>[]]>[0]
        onAnyDeltaPushById: KeyedEventListener<[ModelDelta<M>[]]>[0]
        onCreateDeltaPush: EventListener<[ModelDelta<M>[]]>[0]
        onCreateDeltaPushById: KeyedEventListener<[ModelDelta<M>[]]>[0]
        onUpdateDeltaPush: EventListener<[ModelDelta<M>[]]>[0]
        onUpdateDeltaPushById: KeyedEventListener<[ModelDelta<M>[]]>[0]
    }
]

function insertValueByTimestamp<M extends Model>(arr: ModelDelta<M>[], el: ModelDelta<M>) {
    let left = 0;
    let right = arr.length;

    while (left < right) {
        const mid = (left + right) >>> 1; // Faster than Math.floor
        if (arr[mid].timestamp <= el.timestamp) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    arr.splice(left, 0, el);
}

export function createDeltaStore<M extends Model>() {
    const [deltaStreams, setDeltaStream] = createStore<Record<string, ModelDelta<M>[]>>({})

    const [onAnyDeltaPush, triggerAnyDeltaPush] = createEvent<[ModelDelta<M>[]]>()
    const [onAnyDeltaPushById, triggerAnyDeltaPushById] = createKeyedEvent<[ModelDelta<M>[]]>()
    const [onUpdateDeltaPush, triggerUpdateDeltaPush] = createEvent<[ModelDelta<M>[]]>()
    const [onUpdateDeltaPushById, triggerUpdateDeltaPushById] = createKeyedEvent<[ModelDelta<M>[]]>()
    const [onCreateDeltaPush, triggerCreateDeltaPush] = createEvent<[ModelDelta<M>[]]>()
    const [onCreateDeltaPushById, triggerCreateDeltaPushById] = createKeyedEvent<[ModelDelta<M>[]]>()

    function pushDelta(modelId: string, ...events: Array<ModelDeltaOptionalId<M>>): Array<ModelDelta<M>> {
        const stream = deltaStreams[modelId] as ModelDelta<M>[] | null
        const eventsWithId: ModelDelta<M>[] = events
            .map(e => ({...e, modelId, timestamp: e.timestamp ?? Date.now()} as ModelDelta<M>))
        if (stream == null) {
            setDeltaStream(modelId, eventsWithId)
            triggerCreateDeltaPush(eventsWithId)
            triggerCreateDeltaPushById(modelId, eventsWithId)
        } else {
            setDeltaStream(modelId, produce((arr) => {
                for (const event of eventsWithId) {
                    insertValueByTimestamp(arr, event)
                }
            }))
            triggerUpdateDeltaPush(eventsWithId)
            triggerUpdateDeltaPushById(modelId, eventsWithId)
        }
        triggerAnyDeltaPush(eventsWithId)
        triggerAnyDeltaPushById(modelId, eventsWithId)
        return eventsWithId
    }

    return [
        pushDelta,
        {
            getStreamById(id: string): ModelDelta<M>[] | undefined {
                return deltaStreams?.[id]
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
