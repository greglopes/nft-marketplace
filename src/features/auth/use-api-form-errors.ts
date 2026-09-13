import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/lib/api/client'

/** Maps API field errors (422/409) into react-hook-form; returns the global message. */
export function applyApiErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): string {
  const e = ApiError.from(error)
  if (e.fields && Object.keys(e.fields).length > 0) {
    for (const [field, message] of Object.entries(e.fields)) setError(field as Path<T>, { type: 'server', message })
    return '' // field-level messages already explain the problem
  }
  return e.message
}
