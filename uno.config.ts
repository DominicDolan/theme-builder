import {defineConfig, transformerAttributifyJsx} from "unocss"
import presetAttributify from '@unocss/preset-attributify'
import {layoutPreset} from "./src/style/layout"

export default defineConfig({
    rules: [],
    presets: [
        layoutPreset,
        presetAttributify()
    ],
    transformers: [
        transformerAttributifyJsx()
    ]
})
