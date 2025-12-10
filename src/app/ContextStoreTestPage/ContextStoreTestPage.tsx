import {createContextStore} from "~/packages/contextStore/ContextStore"
import {createMemo, createSignal} from "solid-js"

const [DataStoreProvider, defineDataStore] = createContextStore<{ data: string }>()
export function ContextStoreTestPage() {
    return <div>
        <DataStoreProvider data={"test"} >
            <div>
                <ChildComponent/>
            </div>
        </DataStoreProvider>
    </div>
}


const useSomeStore = defineDataStore((props) => {
    const [moreData] = createSignal("test")

    const combined = createMemo(() => {
        return `${props.data} - ${moreData()}`
    })
    return {
        moreData,
        combined
    }
})

export function ChildComponent() {

    const {combined} = useSomeStore()

    return <div>
        Data received: {combined()}
    </div>
}