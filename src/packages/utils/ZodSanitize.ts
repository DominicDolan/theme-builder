import {ZodSafeParseError, ZodSafeParseResult, ZodSafeParseSuccess} from "zod"

export type SanitizedZodError<T> = Omit<ZodSafeParseError<T>["error"], "format" | "_zod" | "flatten" | "addIssue" | "addIssues" | "isEmpty">
export type SanitizedParseZodError<T> = (Omit<ZodSafeParseError<T>, "error"> & { error: SanitizedZodError<T> })
export type SanitizedZodResult<T> = ZodSafeParseSuccess<T> | SanitizedParseZodError<T>

export function sanitize<T>(result: ZodSafeParseResult<T>): SanitizedZodResult<T>  {
    if (result.success) {
        return {
            data: result.data,
            success: true,
        }
    } else {
        return {
            error: {
                issues: result.error.issues,
                message: result.error.message,
                name: result.error.name,
                type: result.error.type,
            },
            success: false
        }
    }
}