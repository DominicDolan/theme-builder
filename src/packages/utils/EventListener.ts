import {createId} from "@paralleldrive/cuid2"

export interface EventListenerInterface {
    on: (listener: string, fn: Function) => string
    trigger: ((listener: string, ...params: Array<any>) => any) & Record<string, (params?: any) => void>
    clear: () => void
    clearEvent: (eventId: string) => void
}

export class EventListener implements EventListenerInterface {
    on: (listener: string, fn: Function) => string
    trigger: ((listener: string, ...params: Array<any>) => any) & Record<string, (params?: any) => void>
    clear: () => void
    clearEvent: (eventId: string) => void

    constructor() {
        const listeners: Record<string, Array<[id: string, fn: Function]>> = {}
        this.on = function (listener: string, fn: Function) {
            if (listeners[listener] == null) {
                listeners[listener] = []
            }

            const eventId = createId()
            listeners[listener].push([eventId, fn])
            this.trigger[listener] = (...params: any) => {
                listeners[listener].forEach(([id, fn]) => fn(...params))
            }

            return eventId
        }

        this.trigger = function(listener: string, ...params: Array<any>): any {
            if (listeners[listener] != null) {
                listeners[listener].forEach(([id, fn]) => fn(...params))
            }
        } as ((listener: string, ...params: Array<any>) => any) & Record<string, (...params: Array<any>) => void>

        this.clear = function () {
            for (const key in listeners){
                listeners[key].splice(0, listeners[key].length)
            }
        }

        this.clearEvent = function(eventId: string) {
            const eventNames = Object.keys(listeners)

            for (const eventName of eventNames) {
                if (listeners[eventName] != null && listeners[eventName].find(([id]) => id === eventId)) {
                    listeners[eventName] = listeners[eventName].filter(([id]) => id !== eventId)
                }
            }
        }
    }

}