
type LayoutAttributeNames = "flex" | "grid" | "grid-area" | "grid-row" | "grid-col" | "spacing" | "sizing"

export interface LayoutAttributes extends Partial<Record<LayoutAttributeNames, string | boolean>> {}

declare module 'solid-js' {
    namespace JSX {
        interface HTMLAttributes<T> extends LayoutAttributes {}

        interface IntrinsicElements {
            ["text-input"]: any
        }
    }
}
