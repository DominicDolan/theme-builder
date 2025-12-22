import {modelSchema} from "~/data/Model";
import {ModelDelta, PartialModelDelta} from "~/data/ModelDelta";
import {z} from "zod";

export const colorDefinitionSchema = modelSchema.extend({
    hex: z.string(),
    alpha: z.number(),
    name: z.string().regex(/^--/)
})

export type ColorDefinition = z.infer<typeof colorDefinitionSchema>

export type ColorDelta = ModelDelta<ColorDefinition>
export type ColorDeltaOptional = PartialModelDelta<ColorDefinition>
