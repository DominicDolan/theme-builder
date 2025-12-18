import {ModelDelta} from "~/data/ModelDelta"
import {Model, PartialModel} from "~/data/Model";


export function reduceMixedDeltas<M extends Model>(deltas: ModelDelta<M>[]): Record<string, Partial<M>> {
    const ids = new Set(deltas.map(e => e.modelId))
    function reduceById(id: string): Partial<M> {
        const deltasById = deltas
            .filter(e => e.modelId === id)
            .toSorted((a, b) => a.timestamp - b.timestamp)

        return deltasById.reduce((acc: Partial<M>, v) => {
            return {
                ...acc,
                ...v
            }
        }, { id, updatedAt: deltas.at(-1)?.timestamp ?? new Date().getTime() } as Partial<M>)
    }


    const map: Record<string, Partial<M>> = {}
    for (const id of ids) {
        map[id] = reduceById(id)
    }

    return map
}

export function reduceDeltasToModel<M extends Model>(deltas: ModelDelta<M>[]): PartialModel<M> | null {
    return reduceDeltasToModelAfter(deltas, -1)
}

export function reduceDeltasToModelAfter<M extends Model>(deltas: ModelDelta<M>[], after: number): PartialModel<M> | null {
    if (deltas.length === 0) {
        return null
    }
    const ids = new Set(deltas.map(e => e.modelId))
    if (ids.size !== 1) {
        if (ids.size === 0) {
            throw new Error("undefined modelId, reconcileEvents be called with deltas that have a modelId")
        } else {
            throw new Error("reconcileEvents should be called with deltas from a single Model, multiple IDs: " + Array.from(ids).join(", "))
        }
    }
    const id = Array.from(ids)[0]

    const acc = { id, updatedAt: deltas.at(-1)?.timestamp ?? Date.now() } as PartialModel<M>
    const handledKeys = ["modelId", "timestamp"]

    for (let i = deltas.length - 1; i >= 0; i--) {
        if (deltas[i].timestamp <= after) {
            continue
        }
        for (const key in deltas[i]) {
            if (handledKeys.includes(key)) continue

            acc[key as keyof PartialModel<M>] = deltas[i][key as keyof ModelDelta<M>] as any
            handledKeys.push(key)
        }
    }

    return acc
}

export function squashDeltasToSingle<M extends Model>(deltas: ModelDelta<M>[]): ModelDelta<M> {
    const lastDelta = deltas.at(-1)
    if (deltas.length < 1 || lastDelta == undefined) {
        throw new Error("Cannot squash deltas, the given array is empty")
    }

    const acc = { modelId: lastDelta.modelId, timestamp: lastDelta.timestamp } as ModelDelta<M>
    const handledKeys: string[] = ["modelId", "timestamp"]
    for (let i = deltas.length - 1; i >= 0; i--) {
        for (const key in deltas[i]) {
            if (handledKeys.includes(key)) continue

            acc[key as keyof ModelDelta<M>] = deltas[i][key as keyof ModelDelta<M>] as any
            handledKeys.push(key)
        }
    }

    return acc
}

export function reduceDeltasOntoModel<M extends Model>(model: PartialModel<M>, deltas: ModelDelta<M>[]): PartialModel<M> {
    const newModel = reduceDeltasToModelAfter(deltas, model.updatedAt)

    return {
        ...model,
        ...newModel
    }
}

export function reduceGroupedDeltas<M extends Model>(deltas: Record<string, ModelDelta<M>[]>) {
    const ids = Object.keys(deltas)

    const map = {} as Record<string, PartialModel<M>>
    for (const id of ids) {
        const model = reduceDeltasToModel(deltas[id])
        if (model == null) continue

        map[id] = model
    }

    return map
}

export function reduceGroupedDeltasToArray<M extends Model>(deltas: Record<string, ModelDelta<M>[]>) {
    const ids = Object.keys(deltas)

    return ids.map(id => reduceDeltasToModel(deltas[id]))
}
