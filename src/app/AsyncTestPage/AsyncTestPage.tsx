import {createAsync, query, revalidate} from "@solidjs/router"
import {Suspense} from "solid-js"
import {createStore} from "solid-js/store"

function resolveAfter<T>(timeout: number, result: T) {
    return new Promise<T>((res) => {
        setTimeout(() => {
            res(result)
        }, timeout)
    })
}

function Internal(props: { data: string[] | undefined }) {
    const [store, setStore] = createStore<string[]>(props.data ?? [])

    return store.join(", ")
}

const getResults = query(async () => {
    "use server"
    const result = await resolveAfter(1000, ["result 1", "result 2"])
    return result
}, "get-results")
export function AsyncTestPage() {

    const [items, setItems] = createStore<string[]>([])
    const async1 = createAsync(async () => {
        return await getResults()
    })

    return <div>
        Test Page
        <div flex={"col gap-4"}>
            <Suspense fallback={"Loading..."}>
                {/*{Internal({ data: async1() })}*/}
                <Internal data={async1()}/>
                {/*<For each={async1()}>*/}
                {/*    {(text) => <div>Result: {text}</div>}*/}
                {/*</For>*/}
            </Suspense>
            <div flex={"col gap-2"}>
                <button onClick={() => setItems(items.length, `result ${items.length}`)}>Add</button>
                <button onClick={() => revalidate(getResults.key)}>Invalidate</button>
            </div>
        </div>
    </div>
}