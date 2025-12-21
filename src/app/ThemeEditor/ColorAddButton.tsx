import {useColorContext} from "~/app/ThemeEditor/ThemeEditor";
import {createId} from "@paralleldrive/cuid2";

export function ColorAddButton() {

    const [pushColorDelta] = useColorContext()

    function addColor() {
        pushColorDelta("create", {
            hex: "#000000",
            alpha: 1.0,
            name: "",
        })
    }

    return <button onClick={addColor}>Add Color</button>
}
