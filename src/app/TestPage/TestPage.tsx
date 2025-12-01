import {createSignal, For, Suspense} from "solid-js"
import {defineDeltaStore} from "~/packages/repository/DeltaStore"
import {Model} from "~/packages/repository/Model"
import {ModelDelta} from "~/packages/repository/ModelDelta"
import {createReadModelStore} from "~/packages/repository/ReadModelStore"

const useDeltaStore = defineDeltaStore<Model & { name: string }>()

export function TestPage() {

    return <div>
        <Suspense fallback={"Loading..."}>
            <TestComponent/>
        </Suspense>
    </div>
}


export function TestComponent() {

    const modelId = "id-1"
    const deltaStore = useDeltaStore(() => {
        return new Promise((res) => {
            setTimeout(() => {
                const data: ModelDelta<Model & { name: string }>[] = [
                    {
                        modelId,
                        timestamp: 0,
                        name: "Test name"
                    },
                    {
                        modelId,
                        timestamp: 100,
                        name: "Test name Updated"
                    },
                ]
                res({ [modelId]: data })
            }, 1000)
        })
    })

    const [push] = deltaStore

    const [text, setText] = createSignal("")

    const [models] = createReadModelStore(deltaStore)

    function addText() {
        push(modelId, {
            name: text()
        })
        setText("")
    }

    return <div>
        <div class={"text-h1"}>
        Test

        </div>
            <div flex={"row gap-4"}>
                <div sizing={"min-w-35"}>From Store</div>
                <For each={models ?? []}>{(delta) => {
                    return <div>{JSON.stringify(delta)}</div>
                }}</For>
            </div>
        <div flex={"row gap-4"}>
            <input value={text()} onInput={(e) => setText(e.target.value)}/>
            <button onClick={addText}>Add</button>
        </div>
    </div>
}