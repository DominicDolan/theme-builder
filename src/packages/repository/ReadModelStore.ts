import {Model, PartialModel} from "~/packages/repository/Model"
import {DeltaStore} from "~/packages/repository/DeltaStore"
import {createStore, produce, reconcile as reconcileSolid} from "solid-js/store"
import {reduceDeltas, reduceDeltasAfter} from "~/packages/repository/DeltaReducer"
import {createEvent, EventListener} from "~/packages/utils/EventListener"
import {batch} from "solid-js"


export type ReadModelStore<M extends Model> = [
    modelsList: () => Promise<M[] | undefined>,
    {
        getModelById(id: string): M | undefined,
        onModelCreate: EventListener<[PartialModel<M>]>[0]
        onModelUpdate: EventListener<[PartialModel<M>]>[0]
        populate(values: M[]): void
        reconcile(values: Record<string, M> | M[]): void
    }
]

function readModelArrayToObject<M extends Model>(values: M[]) {
    return values.reduce((acc, v) => {
        acc[v.id] = {...v}
        return acc
    }, {} as Record<string, M>)
}

export function createReadModelStore<M extends Model>(eventStore: DeltaStore<M>): ReadModelStore<M> {
    const [_, { getStreamById, onCreateDeltaPush, onUpdateDeltaPushById, onAnyDeltaPush }] = eventStore
    const [modelsById, setModels] = createStore<Record<string, M>>({})
    const [modelsListStore, setModelListStore] = createStore<M[]>([])

    const [onModelUpdate, triggerModelUpdate] = createEvent<[PartialModel<M>]>()
    const [onModelCreate, triggerModelCreate] = createEvent<[PartialModel<M>]>()
    const [onModelPopulated, triggerModelPopulate] = createEvent<[]>()

    function clearAll() {
        setModels(produce((models) => {
            for (const key in models) {
                delete models[key]
            }
        }))
    }

    function populate(values: M[]) {
        batch(() => {
            const contents = values.reduce((acc, v) => {
                acc[v.id] = {...v}
                return acc
            }, {} as Record<string, M>)
            clearAll()
            setModels(contents)

            const ids = Object.keys(modelsById)

            setModelListStore(ids.map(id => modelsById[id]))
            triggerModelPopulate()
        })
    }

    function reconcile(values: Record<string, M> | M[]) {
        batch(() => {
            const isArray = Array.isArray(values)

            function reconcileArray(values: M[]) {
                for (const value of values) {
                    const index = modelsListStore.findIndex(x => x.id === value.id)
                    if (index != -1) {
                        setModelListStore(index, reconcileSolid({...value}))
                    } else {
                        setModelListStore(modelsListStore.length, {...value})
                    }
                }
            }

            if (isArray) {
                const valueObject = readModelArrayToObject(values)
                setModels(reconcileSolid(valueObject))
                reconcileArray(values)
            } else {
                setModels(values)
                const valueList = isArray ? values : Object.keys(values).map(key => values[key])
                reconcileArray(valueList)
            }
            triggerModelPopulate()
        })
    }

    onCreateDeltaPush((events) => {
        const modelFromEvents = reduceDeltasToModel(events)
        if (modelFromEvents == null) return

        const modelId = events[0].modelId
        setModels(modelFromEvents.id, modelFromEvents as M)
        const [model, setModel] = createStore<M>(modelsById[modelId])
        triggerModelCreate(model)
        triggerModelUpdate(model)

        onUpdateDeltaPushById(modelId, () => {
            console.log("updating", model)
            const stream = getStreamById(modelId)
            if (stream == undefined) return

            const newUpdates = reduceDeltasToModelAfter(stream, model.updatedAt)
            if (newUpdates == null) return

            console.log("updating model", modelId, newUpdates)
            for (const key in newUpdates) {
                if (key === "id") {
                    continue
                }
                setModel(key as any, newUpdates[key as keyof PartialModel<M>])
            }
            triggerModelUpdate(model)
        })
    })


    onModelUpdate((model) => {
        const index = modelsListStore.findIndex(m => m.id === model.id)
        if (index === -1) {
            setModelListStore(modelsListStore.length, model as M)
        } else {
            setModelListStore(index, reconcileSolid(model as M))
        }
    })

    let isDirty = true

    onAnyDeltaPush(() => {
        isDirty = true
    })

    onModelPopulated(() => {
        isDirty = false
    })

    onModelUpdate(() => {
        if (isDirty) {
            triggerModelPopulate()
            isDirty = false
        }
    })

    const modelListStoreAsync = async () => {
        console.log("returning promise")
        return await new Promise<M[]>((res) => {
            if (!isDirty) {
                console.log("from initial")
                res(modelsListStore)
            } else {
                onModelPopulated(() => {
                    console.log("after populated")
                    res(modelsListStore)
                }, { once: true })
            }
        })
    }

    return [
        modelListStoreAsync,
        {
            getModelById(id: string): M | undefined {
                return modelsById[id]
            },
            onModelUpdate,
            onModelCreate,
            populate,
            reconcile
        }
    ]
}
