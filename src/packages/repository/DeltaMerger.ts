import {ModelDelta} from "~/packages/repository/ModelDelta"
import {Model} from "~/packages/repository/Model"

export function mergeDeltasAfter<M extends Model>(deltas: ModelDelta<M>[], timestamp: number) {
    if (deltas.length === 0) {
        return null
    }

    let left = 0;
    let right = deltas.length;

    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (deltas[mid].timestamp <= timestamp) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    if (left >= deltas.length) return null;

    let result = deltas[left];

    for (let i = left + 1; i < deltas.length; i++) {
        result = { ...result, ...deltas[i] };
    }

    return result
}

export function mergeDeltas<M extends Model>(deltas: ModelDelta<M>[], timestamp: number) {
    if (deltas.length === 0) {
        return null
    }

    let result = deltas[0];

    for (const delta of deltas.slice(0)) {
        result = { ...result, ...delta };
    }

    return result
}