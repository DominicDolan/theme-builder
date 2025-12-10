import {Context, createContext, useContext} from "solid-js"
import {createStore} from "solid-js/store"

type DefineContextStore<Props, R> = (setup: (props: Props) => R) => () => R

function useContextStore<R>(context: Context<Record<symbol, unknown> | undefined>, key: symbol): R {
    const data = useContext(context)
    if (data?.[key] == null) {
        throw new Error(`Unable to retrieve data for context store with key: ${String(key)}`)
    }

    return data[key] as R
}

export function createContextStore<Props>() {
    const storeContext = createContext<Record<symbol, unknown>>()
    let defineContextStore: DefineContextStore<Props, any> | null = null
    function ContextStoreProvider(props: Props & { children: Element }) {
        const [data, setData] = createStore<Record<symbol, any>>({})

        defineContextStore = function<R>(setup: (props: Props) => R): () => R {
            const contextStoreKey = Symbol()
            setData(contextStoreKey, setup(props))

            return () => {
                if (data[contextStoreKey] == null) {
                    setData(contextStoreKey, setup(props))
                }
                return useContextStore(storeContext, contextStoreKey)
            }
        }
        return <storeContext.Provider value={data}>
            {props.children}
        </storeContext.Provider>
    }

    return [
        ContextStoreProvider,
        function<R>(setup: (props: Props) => R): () => R {
            if (defineContextStore == null) {
                throw new Error("Tried to define a context store before the cotext has been initialised")
            }
            return defineContextStore(setup)
        }
    ]
}