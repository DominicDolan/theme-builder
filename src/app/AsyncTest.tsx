import {createResource, Suspense} from "solid-js"

const count = { a: 0, b: 0, c: 0 }


async function fetchTimeInSeconds(seconds: number) {
    const start = Date.now()
    return new Promise<number>(r => {
        setTimeout(() => {
            const time = Date.now() - start
            r(time/1000)
        }, seconds * 1000)
    })
}

const A = () => {
    count.a++
    const [timeA] = createResource(async () => fetchTimeInSeconds(0.5))
    return <article>
        <h2>A (rendered {count.a}x) - complete in {timeA()}</h2>
        <B/>
    </article>
}

const B = () => {
    count.b++
    const [timeB] = createResource(async () => fetchTimeInSeconds(1))
    return <article>
        <h2>B (rendered {count.b}x) - complete in <Suspense fallback={"Loading Time"}>{timeB()}</Suspense></h2>
        <Suspense><C/></Suspense>
    </article>
}

const C = () => {
    count.c++
    const [timeC] = createResource(async () => fetchTimeInSeconds(2))

    return <article>
        <h2>C (rendered {count.c}x) - complete in {timeC()}</h2>
    </article>
}


export default function AsyncTest() {

    return <Suspense fallback={"Loading..."}><A/></Suspense>
}