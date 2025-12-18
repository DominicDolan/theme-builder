import {createSignal, For, Suspense} from "solid-js"
import {createModelStore} from "~/packages/repository/ModelStore"
import {Model} from "~/data/Model";

export function ModelStoreTestPage() {

    const modelId = "id-1"

    const [text, setText] = createSignal("")

    const [models, push, { getStreamById }] = createModelStore<Model & { name: string, age: number }>()

    function addText() {
        push(modelId, {
            name: text()
        })
        setText("")
    }

    const [age, setAge] = createSignal("0")
    function addAge() {
        push(modelId, {
            age: parseInt(age()) ?? 0
        })
        setAge("0")
    }

    return <div>
        <div class={"text-h1"}>
        Test

        </div>
            <div flex={"row gap-4"}>
                <Suspense fallback={<div>Loading...</div>}>
                    <div sizing={"min-w-35"}>From Store:</div>
                    <For each={models}>{(delta) => {
                        return <div>{JSON.stringify(delta)}</div>
                    }}</For>
                </Suspense>
            </div>
            <div flex={"row gap-4"}>
                <Suspense fallback={<div>Loading...</div>}>
                    <div sizing={"min-w-35"}>From Delta Store:</div>
                    <For each={getStreamById(modelId)}>{(delta) => {
                        return <div>{JSON.stringify(delta)}</div>
                    }}</For>
                </Suspense>
            </div>
        <div flex={"row gap-4"}>
            <input value={text()} onInput={(e) => setText(e.target.value)}/>
            <button onClick={addText}>Add</button>
        </div>
        <div flex={"row gap-4"} spacing={"mt-4"}>
            <input value={age()} onInput={(e) => setAge(e.target.value)} type={"number"}/>
            <button onClick={addAge}>Add</button>
        </div>
    </div>
}
