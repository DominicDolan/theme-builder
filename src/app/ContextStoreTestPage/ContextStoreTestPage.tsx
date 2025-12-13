import {createContextStore} from "~/packages/contextStore/ContextStore"
import {createMemo, createSignal} from "solid-js"

const [DataStoreProvider, defineDataStore] = createContextStore<{ data: string }>()
export function ContextStoreTestPage() {
    return <div>
        <DataStoreProvider data={"test"} >
            <div>
                <ChildComponent/>
            </div>
            <AnotherComponent/>
        </DataStoreProvider>
    </div>
}


const useSomeStore = defineDataStore((props) => {
    const [moreData, setMoreData] = createSignal(0)

    const combined = createMemo(() => {
        return `${props.data} - ${moreData()}`
    })

    function increment(){
        setMoreData(moreData() + 1)
    }

    return {
        moreData,
        combined,
        increment
    }
})

const useSomeOtherStore = defineDataStore((props) => {
    const testFromSomeOtherStore = createMemo(() => {
        return props.data + " from some other store"
    })

    return {
        testFromSomeOtherStore
    }
})

export function ChildComponent() {

    const {combined, increment} = useSomeStore()

    const [count, setCount] = createSignal(0)

    function increment2(){
        setCount(count() + 1)
    }

    return <div flex={"col gap-4"}>
        <div flex={"row gap-4"}>
            <span>
                Data received: {combined()}
            </span>
            <button onClick={increment}>Update</button>
        </div>
        <div flex={"row gap-4"}>
            <span>
                Data in component: {count()}
            </span>
            <button onClick={increment2}>Update</button>
        </div>
    </div>
}

function AnotherComponent() {
    const {moreData} = useSomeStore()
    const {testFromSomeOtherStore} = useSomeOtherStore()
    const double = createMemo(() => {
        return moreData() * 2
        }
    )

    return <div>
        <div>
            Doubled: {double()}
        </div>
        <div>Other Store: {testFromSomeOtherStore()}</div>
    </div>
}
