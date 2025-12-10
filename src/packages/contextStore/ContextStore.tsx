import {Context, createContext, useContext, Component} from "solid-js"
import {createStore} from "solid-js/store"

type DefineContextStore<Props> = <R>(setup: (props: Props) => R) => () => R

function useContextStore<R>(context: Context<Record<symbol, unknown> | undefined>, key: symbol): R {
    const data = useContext(context)
    if (data?.[key] == null) {
        throw new Error(`Unable to retrieve data for context store with key: ${String(key)}`)
    }

    return data[key] as R
}

export type CreateContextStore<Props extends Record<string, any>> = [
    Component<Props & {children?: Node | string | number | boolean | null | undefined}>,
    DefineContextStore<Props>
]

export function createContextStore<Props extends Record<string, any>>(): CreateContextStore<Props> {
    const storeContext = createContext<Record<symbol, unknown>>()
    let defineContextStore: DefineContextStore<Props> | null = null
    function ContextStoreProvider(props: Props & {children?: Node | string | number | boolean | null | undefined}) {
        const [data, setData] = createStore<Record<symbol, any>>({})

        defineContextStore = function<R>(setup: (props: Props & {children: Node | string | number | boolean | null | undefined}) => R): () => R {
            const contextStoreKey = Symbol()
            const setupProps = {
                ...props,
                children: undefined
            }
            setData(contextStoreKey, setup(setupProps))

            return () => {
                if (data[contextStoreKey] == null) {
                    setData(contextStoreKey, setup(setupProps))
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
                throw new Error("Tried to define a context store before the cotext has not been initialised")
            }
            return defineContextStore(setup)
        }
    ]
}