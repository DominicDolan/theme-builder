import {ModelEvent} from "~/packages/repository/ModelEvent"
import {Model, PartialModel} from "~/packages/repository/Model"


export function reconcileMixedEvents<M extends Model>(events: ModelEvent<M>[]): Record<string, Partial<M>> {
    const ids = new Set(events.map(e => e.modelId))
    function reduceById(id: string): Partial<M> {
        const eventsById = events
            .filter(e => e.modelId === id)
            .toSorted((a, b) => a.timestamp - b.timestamp)

        return eventsById.reduce((acc: Partial<M>, v) => {
            return {
                ...acc,
                ...v
            }
        }, { id, updatedAt: events.at(-1)?.timestamp ?? new Date().getTime() } as Partial<M>)
    }


    const map: Record<string, Partial<M>> = {}
    for (const id of ids) {
        map[id] = reduceById(id)
    }

    return map
}

export function reconcileEvents<M extends Model>(events: ModelEvent<M>[]): PartialModel<M> | null {
    return reconcileEventsAfter(events, 0)
}

export function reconcileEventsAfter<M extends Model>(events: ModelEvent<M>[], after: number): PartialModel<M> | null {
    if (events.length === 0) {
        return null
    }
    const ids = new Set(events.map(e => e.modelId))
    if (ids.size !== 1) {
        if (ids.size === 0) {
            throw new Error("undefined modelId, reconcileEvents be called with events that have a modelId")
        } else {
            throw new Error("reconcileEvents should be called with events from a single Model, multiple IDs: " + Array.from(ids).join(", "))
        }
    }
    const id = Array.from(ids)[0]

    const acc = { id, updatedAt: events.at(-1)?.timestamp ?? Date.now() } as PartialModel<M>
    const handledKeys = ["modelId", "timestamp"]

    for (let i = events.length; i >= 0; i--) {
        for (const key in events[i]) {
            if (handledKeys.includes(key) || events[i].timestamp <= after) continue

            acc[key as keyof PartialModel<M>] = events[i][key as keyof ModelEvent<M>] as any
            handledKeys.push(key)
        }
    }

    return acc
}

export function reconcileEventsOntoModel<M extends Model>(model: PartialModel<M>, events: ModelEvent<M>[]): PartialModel<M> {
    const newModel = reconcileEventsAfter(events, model.updatedAt)

    return {
        ...model,
        ...newModel
    }
}

export function reconcileGroupedEvents<M extends Model>(events: Record<string, ModelEvent<M>[]>) {
    const ids = Object.keys(events)

    const map = {} as Record<string, PartialModel<M>>
    for (const id of ids) {
        const model = reconcileEvents(events[id])
        if (model == null) continue

        map[id] = model
    }

    return map
}

export function reconcileGroupedEventsToArray<M extends Model>(events: Record<string, ModelEvent<M>[]>) {
    const ids = Object.keys(events)

    return ids.map(id => reconcileEvents(events[id]))
}