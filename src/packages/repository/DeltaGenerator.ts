import {Model} from "~/packages/repository/Model"
import {ModelDelta} from "~/packages/repository/ModelDelta"
import {isEqual} from "~/packages/utils/IsEqual"

export function calculateDelta<M extends Model>(before: M, after: M): ModelDelta<M> | null {
    // Ensure we're comparing the same model
    if (before.id !== after.id) {
        throw new Error('Cannot calculate delta between different models');
    }

    const changes: Partial<Omit<M, 'id' | 'updatedAt'>> = {};
    let hasChanges = false;

    // Get all keys from the model, excluding 'id' and 'updatedAt'
    const keysToCompare = Object.keys(after).filter(
        key => key !== 'id' && key !== 'updatedAt'
    ) as Array<keyof Omit<M, 'id' | 'updatedAt'>>;

    // Compare each field
    for (const key of keysToCompare) {
        const beforeValue = before[key];
        const afterValue = after[key];

        // Deep comparison for objects, shallow for primitives
        if (!isEqual(beforeValue, afterValue)) {
            changes[key] = afterValue;
            hasChanges = true;
        }
    }

    // Return null if no changes detected
    if (!hasChanges) {
        return null;
    }

    // Return the delta with required fields and changes
    return {
        modelId: after.id,
        timestamp: after.updatedAt,
        ...changes
    } as ModelDelta<M>;
}
