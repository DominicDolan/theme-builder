import styles from "~/app/ImportConfig/ExportConfig.module.css"
import {action} from "@solidjs/router"
import {useContactUsStore} from "~/app/ContactUs/ContactUsStore"
import {createId} from "@paralleldrive/cuid2"

const saveContactUsForm = action(async (id: string, formData: FormData) => {
    "use server"

    const store = useContactUsStore()

    await store.add(id, formData)
})
export default function ContactUs() {

    function onSubmitClicked(e: SubmitEvent) {
        e.preventDefault()

        const formFields = (e.target as HTMLElement).querySelectorAll("input, textarea") as NodeListOf<HTMLInputElement | HTMLTextAreaElement>
        formFields.forEach(item => {
            console.log("validity", item.validity.valid)
        })
        console.log(e)
    }

    const id = createId()

    return <div>
        <h2>Contact Us</h2>
        <form action={saveContactUsForm.with(id)} method={"post"} class={`filled ${styles.formGrid}`} spacing={"pa-4"}>
            <div class={"formField"} flex={"col gap-2"}>
                <label for="fname">First Name</label>
                <input type={"text"} name={"fname"} id={"fname"} required/>
            </div>
            <div class={"formField"} flex={"col gap-2"}>
                <label for="lname">Last Name</label>
                <input type={"text"} name={"lname"} id={"lname"} required/>
            </div>
            <div class={"formField"} flex={"col gap-2"} grid={"col-span-full"}>
                <label for="email">Email</label>
                <input type={"email"} name={"email"} id={"email"} required/>
            </div>
            <fieldset class={"formField"} grid-col={"span-full"}>
                <div flex={"col gap-2"}>
                    <legend>Query Type</legend>

                    <div flex={"row gap-4 space-around"}>
                        <div flex={"grow row gap-4"}>
                            <input type={"radio"} name={"query"} id={"general"} value={"General Query"} required/>
                            <label for={"general"}>General Query</label>
                        </div>
                        <div flex={"grow row gap-4"}>
                            <input type={"radio"} name={"query"} id={"support"} value={"Support Request"} required/>
                            <label for={"support"}>Support Request</label>
                        </div>
                    </div>

                </div>
            </fieldset>
            <div class={"formField"} flex={"col gap-2"} grid-col={"span-full"}>
                <label for="message">Message</label>
                <textarea name={"message"} id={"message"}></textarea>
            </div>
            <div class={"formField"} flex={"row gap-2"} grid-col={"span-full"}>
                <input id="consent" type={"checkbox"} required/>
                <label for="consent">Do you consent to us sending you emails</label>
            </div>
            <button grid-col={"span-full"}>Submit</button>
        </form>
    </div>
}