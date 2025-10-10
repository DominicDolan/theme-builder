import type { APIEvent } from "@solidjs/start/server";
import {useThemeEditorStore} from "~/app/ThemeEditor/ThemeEditorStore"

export function GET(event: APIEvent) {
    const store = useThemeEditorStore()
    return store.getDefinitions()
}