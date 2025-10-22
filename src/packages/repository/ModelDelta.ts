import {Model, ModelData} from "~/packages/repository/Model"


export type ModelDelta<M extends Model> = Partial<ModelData<M>> & {
    modelId: string
    timestamp: number
}
export type ModelDeltaOptionalId<M extends Model> = Partial<ModelData<M>> & {
    modelId?: string
    timestamp: number
}

export type ServerModelDelta<M extends Model> = ModelDelta<M> & { deltaId: string }