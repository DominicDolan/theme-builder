import {createContext, createEffect, on, Show, useContext} from "solid-js";
import {createModelStore} from "~/packages/repository/ModelStore";
import {Model, PartialModel} from "~/packages/repository/Model";
import {ModelDelta, ModelDeltaOptionalId} from "~/packages/repository/ModelDelta";

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

    function ContextStoreProvider(props: { deltas: Record<string, ModelDelta<M>[]> | undefined, children: (list: M[]) => any, fallback?: any}) {
        const [models, push] = createModelStore<M>(props.deltas)
        if (props.deltas == undefined) {
            createEffect(on(() => props.deltas, (newValue, oldValue) => {
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
