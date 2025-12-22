import {createModelSchema} from "~/data/ModelSchemaBuilder";
import {colorDefinitionSchema} from "~/data/ColorDefinition";

export default createModelSchema("color_events", colorDefinitionSchema, { recreate: true })
    .addGroupByForeignKey("themes(theme_id)")
    .build();
