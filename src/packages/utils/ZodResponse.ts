import {json, RouterResponseInit} from "@solidjs/router"
import {ZodSafeParseResult} from "zod"
import {sanitizeError} from "~/packages/utils/ZodSanitize"

export function zodResponse(result: ZodSafeParseResult<unknown>, init?: RouterResponseInit) {
    if (result.success) {
        return json({ success: true }, init)
    } else {
        return json({
            success: false,
            error: sanitizeError(result.error)
        }, init)
    }
}
