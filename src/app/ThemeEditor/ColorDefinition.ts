import {ModelData, modelSchema} from "~/packages/repository/Model"
import {z} from "zod"
import {createId} from "@paralleldrive/cuid2"
import {ModelDelta} from "~/packages/repository/ModelDelta"

export const colorDefinitionSchema = modelSchema.extend({
    hex: z.string(),
    alpha: z.number(),
    name: z.string().regex(/^--/)
})

export type ColorDefinition = z.infer<typeof colorDefinitionSchema>

export type ColorDelta = ModelDelta<ColorDefinition>

export function createColorDefinition(defaults?: Partial<ModelData<ColorDefinition>>): ColorDefinition {
    return {
        id: createId(),
        updatedAt: new Date().getTime(),
        hex: defaults?.hex ?? "#000000",
        alpha: 1.0,
        name: "",
    }
}
