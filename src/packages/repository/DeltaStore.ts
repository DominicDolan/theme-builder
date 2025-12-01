import {createStore, produce} from "solid-js/store"
import {Model} from "~/packages/repository/Model"
import {ModelDelta, ModelDeltaOptionalId} from "~/packages/repository/ModelDelta"
import {createEvent, createKeyedEvent, EventListener, KeyedEventListener} from "~/packages/utils/EventListener"
import {AccessorWithLatest, createAsync} from "@solidjs/router"
import {createRenderEffect, on} from "solid-js"

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

export type SourceGetter<M extends Model> = AccessorWithLatest<Record<string, ModelDelta<M>[]> | undefined>

export type DeltaStoreDefinition = {}

export function defineDeltaStore<M extends Model>(definition?: DeltaStoreDefinition) {

    return (source?: (latestTimestamp?: number) => Promise<Record<string, ModelDelta<M>[]>> | Record<string, ModelDelta<M>[]>): DeltaStore<M> => {

        let latestTimestamp = 0
        const asyncGetter: SourceGetter<M> = createAsync(async () => {
            const result = await source?.(latestTimestamp)

            return result ?? {}
        })

        const [deltaStreams, setDeltaStream] = createStore<Record<string, ModelDelta<M>[]>>({})

        const [onAnyDeltaPush, triggerAnyDeltaPush] = createEvent<[ModelDelta<M>[]]>()
        const [onAnyDeltaPushById, triggerAnyDeltaPushById] = createKeyedEvent<[ModelDelta<M>[]]>()
        const [onUpdateDeltaPush, triggerUpdateDeltaPush] = createEvent<[ModelDelta<M>[]]>()
        const [onUpdateDeltaPushById, triggerUpdateDeltaPushById] = createKeyedEvent<[ModelDelta<M>[]]>()
        const [onCreateDeltaPush, triggerCreateDeltaPush] = createEvent<[ModelDelta<M>[]]>()
        const [onCreateDeltaPushById, triggerCreateDeltaPushById] = createKeyedEvent<[ModelDelta<M>[]]>()

        createRenderEffect(on(asyncGetter, (newValue) => {
            if (newValue == null) {
                return
            }

            setTimeout(() => {
                for (const key in newValue) {
                    pushDelta(key, ...newValue[key])
                }
            }, 0)
        }))

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
                // @ts-ignore - pseudo private field
                _sourceGetter: asyncGetter
            }
        ] as const
    }
}
