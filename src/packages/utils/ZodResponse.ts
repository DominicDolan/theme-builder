import {CustomResponse, json, RouterResponseInit} from "@solidjs/router"
import {ZodSafeParseResult} from "zod"
import {SanitizedZodError, sanitizeError} from "~/packages/utils/ZodSanitize"

export function zodResponse(result: ZodSafeParseResult<unknown>, init?: RouterResponseInit): CustomResponse<{ success: true, error: undefined } | { success: false, error: SanitizedZodError<unknown> }> {
    if (result.success) {
        return json({ success: true, error: undefined }, init)
    } else {
        return json({
            success: false,
            error: sanitizeError(result.error)
        }, init)
    }
}
