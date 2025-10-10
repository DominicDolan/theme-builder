import fs from "node:fs"

export function useContactUsStore() {

    async function add(id: string, formData: FormData) {
        const contents = `${id}:${new URLSearchParams(formData as unknown as URLSearchParams).toString()}`
        await new Promise<void>((resolve, reject) => {
            fs.writeFile("contact-us", contents, (e) => {
                if (e) {
                    reject(e)
                } else {
                    resolve()
                }
            })
        })

    }

    return {
        add
    }
}
