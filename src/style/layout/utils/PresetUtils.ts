import {escapeSelector} from "unocss"

export const numberWithUnitRE = /^(-?\d*(?:\.\d+)?)(px|pt|pc|%|r?(?:em|ex|lh|cap|ch|ic)|(?:[sld]?v|cq)(?:[whib]|min|max)|in|cm|mm|rpx)?$/i
export const numberRE = /^(-?\d*(?:\.\d+)?)$/
export const unitOnlyRE = /^(px|[sld]?v[wh])$/i
export const unitOnlyMap: Record<string, number> = {
    px: 1,
    vw: 100,
    vh: 100,
    svw: 100,
    svh: 100,
    dvw: 100,
    dvh: 100,
    lvh: 100,
    lvw: 100,
}
export const bracketTypeRe = /^\[(color|image|length|size|position|quoted|string):/i
export const splitComma = /,(?![^()]*\))/g

function round(n: number) {
    return +n.toFixed(10)
}

export function numberWithUnit(str: string) {
    const match = str.match(numberWithUnitRE)
    if (!match)
        return
    const [, n, unit] = match
    const num = Number.parseFloat(n)
    if (unit && !Number.isNaN(num))
        return `${round(num)}${unit}`
}

export function cssvar(str: string) {
    if (/^\$[^\s'"`;{}]/.test(str)) {
        const [name, defaultValue] = str.slice(1).split(',')
        return `var(--${escapeSelector(name)}${defaultValue ? `, ${defaultValue}` : ''})`
    }
}

export function rem(str: string) {
    if (!str)
        return
    if (unitOnlyRE.test(str))
        return `${unitOnlyMap[str]}${str}`
    const match = str.match(numberWithUnitRE)
    if (!match)
        return
    const [, n, unit] = match
    const num = Number.parseFloat(n)
    if (!Number.isNaN(num)) {
        if (num === 0)
            return '0'
        return unit ? `${round(num)}${unit}` : `${round(num / 4)}rem`
    }
}

export function number(str: string) {
    if (!numberRE.test(str))
        return
    const num = Number.parseFloat(str)
    if (!Number.isNaN(num))
        return round(num)
}