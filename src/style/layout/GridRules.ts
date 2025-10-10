import type {Rule} from "@unocss/core"
import {cssvar, number} from "./utils/PresetUtils"

function rowCol(s: string) {
    return s.replace('col', 'column')
}

export const grids: Rule[] = [
    [/^(?:grid-)?(row|col)-span-(.+)$/, ([, c, s]) => {
        if (s === 'full')
            return { [`grid-${rowCol(c)}`]: '1/-1' }
        const v = number(s)
        if (v != null)
            return { [`grid-${rowCol(c)}`]: `span ${v}/span ${v}` }
    }, { autocomplete: '(grid-row|grid-col|row|col)-span-<num>' }],

    // starts & ends
    [/^(?:grid-)?(row|col)-start-(.+)$/, ([, c, v]) => ({ [`grid-${rowCol(c)}-start`]: cssvar(v) ?? v })],
    [/^(?:grid-)?(row|col)-end-(.+)$/, ([, c, v]) => ({ [`grid-${rowCol(c)}-end`]: cssvar(v) ?? v }), { autocomplete: '(grid-row|grid-col|row|col)-(start|end)-<num>' }],

    // areas
    [/^grid-area-(.+)$/, ([, v]) => ({ ["grid-area"]: cssvar(v) ?? v })],

    [/^(?:grid-)?(row|col)-subgrid$/, ([, c, v]) => ({[`grid-template-${rowCol(c) + "s"}`]: "subgrid", display: "grid"})],
]
