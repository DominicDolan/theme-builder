import {createInputSignal} from "~/packages/forms/InputSignal"
import {GET} from "~/routes/api/export"

export default function ExportConfig() {
    const [fileLocationProps] = createInputSignal()

    function onSubmitClicked(e: SubmitEvent) {
        e.preventDefault()

        const inputs = (e.target as HTMLElement).querySelectorAll("select, input, textarea")as NodeListOf<HTMLInputElement>

        if (!Array.from(inputs).some(el => el.validity.valid)) {
            return
        }

        fetch("/api/export", {method: "POST", body: fileLocationProps.value?.toString()}).then(() => {
            console.log("fetched")
        })
    }

    return <div sizing={"h-100"}>
        <h2>
            Stylesheet config
        </h2>

        <form class={"filled"} action={"api/export"} method={"post"}>
            <div class={"formField"} flex={"col gap-2"} spacing={"my-8"} sizing={"w-50%"}>
                <label for={"location"}>Stylesheet File Name</label>
                <input type={"text"} name={"location"} id={"location"} spacing={"pa-2"} required {...fileLocationProps}/>
            </div>
            <button>Save</button>
        </form>
    </div>
}