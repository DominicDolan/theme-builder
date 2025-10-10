import {Model, ModelData} from "~/packages/repository/Model"


export type ModelEvent<M extends Model> = Partial<ModelData<M>> & {
    modelId: string
    timestamp: number
}
export type ModelEventOptionalId<M extends Model> = Partial<ModelData<M>> & {
    modelId?: string
    timestamp: number
}

export type ServerModelEvent<M extends Model> = ModelEvent<M> & { eventId: string }