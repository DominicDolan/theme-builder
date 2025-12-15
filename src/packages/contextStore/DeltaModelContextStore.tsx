import {createContext, createEffect, on, Show, useContext} from "solid-js";
import {createModelStore} from "~/packages/repository/ModelStore";
import {Model, PartialModel} from "~/packages/repository/Model";
import {ModelDelta, ModelDeltaOptionalId} from "~/packages/repository/ModelDelta";
import {sliceArrayAfter} from "~/packages/repository/DeltaMerger";

export type ContextStoreProviderProps<M extends Model> = {
    deltas: Record<string, ModelDelta<M>[]> | undefined
    children: (list: M[]) => any
    fallback?: any
    onDeltaPush?: (modelId: string, newDeltas: ModelDelta<M>[], store: ReturnType<typeof createModelStore<M>>[2]) => void
}

export function deltasSince<M extends Model>(timestamp: number, callback: Required<ContextStoreProviderProps<M>>["onDeltaPush"]): ContextStoreProviderProps<M>["onDeltaPush"] {
    return (modelId: string, newDeltas: ModelDelta<M>[], store: ReturnType<typeof createModelStore<M>>[2]) => {
        const stream = store.getStreamById(modelId)

        if (stream == null) return () => {}

        const mergedDeltas = sliceArrayAfter(stream, timestamp)

        if (mergedDeltas == null) return () => {}

        callback(modelId, mergedDeltas, store)
    }
}


export function createDeltaModelContextStore<M extends Model>() {
    const storeContext = createContext<{ pushDelta: (modelId: string, ...events: ModelDeltaOptionalId<M>[]) => Promise<PartialModel<M>>}>()

    function useDeltaStore() {
        const context = useContext(storeContext)
        if (context == null) {
            throw new Error("Unable to retrieve context store, this function should only be called inside a ContextStoreProvider")
        }

        return [
            context.pushDelta
        ] as const
    }

    function ContextStoreProvider(props: ContextStoreProviderProps<M>) {
        const [models, push, store] = createModelStore<M>(props.deltas)
        const {onAnyDeltaPush} = store

        onAnyDeltaPush((deltas) => {
            if (deltas.length === 0) {
                return
            }
            const modelId = deltas[0].modelId
            props.onDeltaPush?.(modelId, deltas, store)
        })

        if (props.deltas == undefined) {
            createEffect(on(() => props.deltas, (_, oldValue) => {
                if (oldValue != undefined) {
                    console.warn("DeltaModelContextStore: deltas won't update reactively except when changing from undefined")
                    return
                }
                for (const key in props.deltas) {
                    push(key, ...props.deltas[key])
                }
            }))
        }

        return <Show when={props.deltas != undefined} fallback={props.fallback}>
            <storeContext.Provider value={{pushDelta: push}}>
                {props.children(models)}
            </storeContext.Provider>
        </Show>
    }

    return [
        ContextStoreProvider,
        useDeltaStore,
    ] as const
}
