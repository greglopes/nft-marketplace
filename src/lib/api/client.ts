import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { apiErrorSchema, type ApiErrorBody, type ApiErrorCode } from './contracts'
import { getGuestId, sessionStore } from '../session'

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fields?: Record<string, string>
  readonly details?: unknown
  readonly isNetworkError: boolean
  readonly isTimeout: boolean

  constructor(init: { status: number; code: ApiErrorCode; message: string; fields?: Record<string, string>; details?: unknown; isNetworkError?: boolean; isTimeout?: boolean }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fields = init.fields
    this.details = init.details
    this.isNetworkError = init.isNetworkError ?? false
    this.isTimeout = init.isTimeout ?? false
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error
    if (axios.isCancel(error)) {
      return new ApiError({ status: 0, code: 'TRANSIENT_FAILURE', message: 'Requisição cancelada.' })
    }
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return new ApiError({ status: 0, code: 'TRANSIENT_FAILURE', message: 'Tempo limite excedido. Verifique sua conexão.', isTimeout: true })
      }
      if (!error.response) {
        return new ApiError({ status: 0, code: 'TRANSIENT_FAILURE', message: 'Sem conexão com o servidor.', isNetworkError: true })
      }
      const parsed = apiErrorSchema.safeParse(error.response.data)
      const body: ApiErrorBody = parsed.success
        ? parsed.data
        : { code: error.response.status >= 500 ? 'INTERNAL_ERROR' : 'TRANSIENT_FAILURE', message: 'Algo deu errado. Tente novamente.' }
      return new ApiError({ status: error.response.status, ...body })
    }
    return new ApiError({ status: 0, code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Erro inesperado.' })
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config) => {
  const { token } = sessionStore.get()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Guest-Id', getGuestId())
  return config
})

let onSessionExpired: (() => void) | null = null
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

http.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    const apiError = ApiError.from(error)
    if (apiError.status === 401 && (apiError.code === 'SESSION_EXPIRED' || apiError.code === 'UNAUTHORIZED')) {
      if (sessionStore.get().token) onSessionExpired?.()
    }
    return Promise.reject(apiError)
  },
)

export type RequestConfig = AxiosRequestConfig
