import {useSubmission} from "@solidjs/router"
import {updateColors} from "~/app/ThemeEditor/ThemeEditor"
import {createMemo} from "solid-js"
import {ColorDefinition, ColorDefinitionEvent} from "~/app/ThemeEditor/ColorDefinition"

export default function ColorItem(props: { definition: ColorDefinition, onDefinitionUpdated: (e: Omit<ColorDefinitionEvent, "eventId">) => void }) {

    const saving = useSubmission(updateColors)

    const issues = createMemo(() => {
        const {data, error} = saving.result ?? {}
        return error?.issues ?? []
    })

    function getIssueByPath(path: string) {
        return issues().find(issue => issue.path[0] === path)
    }

    function onColorChanged(e: InputEvent) {
        props.onDefinitionUpdated({
            modelId: props.definition.id,
            timestamp: new Date().getTime(),
            hex: (e.target as HTMLInputElement).value
        })
    }

    function onAlphaChanged(e: Event) {
        props.onDefinitionUpdated({
            modelId: props.definition.id,
            timestamp: new Date().getTime(),
            alpha: parseFloat((e.target as HTMLInputElement).value)
        })

    }

    function onNameChanged(e: Event) {
        props.onDefinitionUpdated({
            modelId: props.definition.id,
            timestamp: new Date().getTime(),
            name: (e.target as HTMLInputElement).value
        })
    }

    return <div flex={"row gap-8"}>
        <div flex={"col gap-4"}>
            <div flex={"row gap-4"}>
                <input value={props.definition.hex} onInput={onColorChanged} class={"filled"} type={"color"} sizing={"h-10 w-16"}/>
                <p>{props.definition.hex} / {props.definition.alpha}</p>
            </div>
            <span sizing={"h-1ch"}>{getIssueByPath("hex")?.message}</span>
            <input value={props.definition.alpha} onInput={onAlphaChanged} class={"filled"} min={0} max={1} step={0.01} type={"range"}/>
            <span>{getIssueByPath("alpha")?.message}</span>
        </div>
        <div class={"formField filled"} flex={"col gap-2"}>
            <label>Variable Name: {props.definition.name}</label>
            <input value={props.definition.name} onInput={onNameChanged}/>
            <span sizing={"h-1ch"}>{getIssueByPath("name")?.message}</span>
        </div>
    </div>
}