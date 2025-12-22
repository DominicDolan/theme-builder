import {createModelSchema} from "~/data/ModelSchemaBuilder";
import {colorDefinitionSchema} from "~/data/ColorDefinition";

export default createModelSchema("color_events", colorDefinitionSchema, { recreate: true, mappings: { group_by_id: "themeId"} })
    .addGroupByForeignKey("themes(theme_id)")
    .build();
