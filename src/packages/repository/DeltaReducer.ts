import {ModelDelta} from "~/packages/repository/ModelDelta"
import {Model, PartialModel} from "~/packages/repository/Model"


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

export function reduceDeltas<M extends Model>(deltas: ModelDelta<M>[]): PartialModel<M> | null {
    return reduceDeltasAfter(deltas, 0)
}

export function reduceDeltasAfter<M extends Model>(deltas: ModelDelta<M>[], after: number): PartialModel<M> | null {
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

    for (let i = deltas.length; i >= 0; i--) {
        for (const key in deltas[i]) {
            if (handledKeys.includes(key) || deltas[i].timestamp <= after) continue

            acc[key as keyof PartialModel<M>] = deltas[i][key as keyof ModelDelta<M>] as any
            handledKeys.push(key)
        }
    }

    return acc
}

export function reduceDeltasOntoModel<M extends Model>(model: PartialModel<M>, deltas: ModelDelta<M>[]): PartialModel<M> {
    const newModel = reduceDeltasAfter(deltas, model.updatedAt)

    return {
        ...model,
        ...newModel
    }
}

export function reduceGroupedDeltas<M extends Model>(deltas: Record<string, ModelDelta<M>[]>) {
    const ids = Object.keys(deltas)

    const map = {} as Record<string, PartialModel<M>>
    for (const id of ids) {
        const model = reduceDeltas(deltas[id])
        if (model == null) continue

        map[id] = model
    }

    return map
}

export function reduceGroupedDeltasToArray<M extends Model>(deltas: Record<string, ModelDelta<M>[]>) {
    const ids = Object.keys(deltas)

    return ids.map(id => reduceDeltas(deltas[id]))
}