import {createSignal} from "solid-js"


export default function Home() {

    const [count, setCount] = createSignal(0);

    return <div>
        <h1>Hello world!</h1>
        <i>search</i>
        <button class="increment" onClick={() => setCount(count() + 1)} type="button">
            Clicks: {count()}
        </button>
        <p>
            Visit{" "}
            <a href="https://start.solidjs.com" target="_blank">
                start.solidjs.com
            </a>{" "}
            to learn how to build SolidStart apps.
        </p>
    </div>
}