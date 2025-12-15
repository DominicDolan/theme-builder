import {createDeltaModelContextStore, deltasSince} from "~/packages/contextStore/DeltaModelContextStore";
import {Model} from "~/packages/repository/Model";
import {ModelDelta, ModelDeltaOptionalId} from "~/packages/repository/ModelDelta";
import {createSignal, For, Suspense} from "solid-js";
import {createAsync} from "@solidjs/router";
import {keyedDebounce} from "~/packages/utils/KeyedDebounce";

type TestModel = Model & {
    name: string
    age: number
}

const [Provider, useDeltaStore] = createDeltaModelContextStore<TestModel>()

export function DeltaModelContextStoreTest() {

    const testModels = createAsync(() => {
        return new Promise<Record<string, ModelDelta<TestModel>[]>>(res =>
            setTimeout(() => res({
                ["test-model-1"]: [
                    {
                        modelId: "test-model-1",
                        timestamp: 100,
                        name: "John",
                        age: 25
                    },
                    {
                        modelId: "test-model-1",
                        timestamp: 200,
                        name: "John Doe",
                        age: 26
                    },
                ],
                ["test-model-2"]: [
                    {
                        modelId: "test-model-2",
                        timestamp: 150,
                        name: "Jane",
                        age: 25
                    },
                    {
                        modelId: "test-model-2",
                        timestamp: 250,
                        name: "Jane Doe",
                        age: 26
                    }
                ]
            }), 1000))
    })

    const save = keyedDebounce((modelId: string, deltas: ModelDeltaOptionalId<TestModel>[]) => {
        console.log("saving deltas debounced:", deltas)
    }, 1000)

    function onDeltaPush(modelId: string, deltas: ModelDeltaOptionalId<TestModel>[]) {
        save(modelId, deltas)
    }

    const [latestTimestamp, setTimestamp] = createSignal(201)
    return <div flex={"col gap-4"}>
        <Suspense fallback={"Loading..."}>
            <Provider deltas={testModels()} onDeltaPush={deltasSince(latestTimestamp(), onDeltaPush)}>
                {(models) => <div flex={"col gap-4"}><For each={models}>{(model) => {
                    return <ChildComponent model={model}/>
                }}</For></div>}
            </Provider>
        </Suspense>
        <button onClick={() => setTimestamp(Date.now())}>Update Timestamp</button>
    </div>
}

function ChildComponent(props: {model: TestModel}) {

    const [push] = useDeltaStore()

    function incrementAge(){
        push(props.model.id, {
            age: props.model.age + 1
        })
    }

    return <div flex={"row gap-4 center"}>
        <span flex={"row gap-1"}>
            <strong>Name</strong>
            <span>{props.model.name}</span>
        </span>
        <span flex={"row gap-1"}>
            <strong>Age</strong>
            <span>{props.model.age}</span>
        </span>
        <button onClick={incrementAge}>Increment Age</button>
    </div>
}
