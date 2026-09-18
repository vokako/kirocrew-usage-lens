/*
 * Stand-in for `@kirocrew/app-sdk` so the page can render OUTSIDE the dashboard.
 *
 * In a real install these come from the host through an import map. The preview
 * aliases them here instead, which is what lets `npm run preview` show the actual
 * built page — same src/, same charts, same arithmetic — with no gateway running.
 * The payload is embedded at build time, so `api.get` resolves from memory rather
 * than over HTTP.
 */
import demo from './demo-payload.json'

export interface AppApi {
  get<T = unknown>(path: string, init?: RequestInit): Promise<T>
  post<T = unknown>(path: string, body?: unknown): Promise<T>
  put<T = unknown>(path: string, body?: unknown): Promise<T>
  patch<T = unknown>(path: string, body?: unknown): Promise<T>
  del<T = unknown>(path: string): Promise<T>
}

const unsupported = (path: string) =>
  Promise.reject(new Error(`preview harness: ${path} is read-only`))

export function useAppApi(): AppApi {
  return {
    get: <T,>(path: string) =>
      path.includes('/series')
        ? (Promise.resolve(demo as unknown as T))
        : unsupported(path),
    post: (path: string) => unsupported(path),
    put: (path: string) => unsupported(path),
    patch: (path: string) => unsupported(path),
    del: (path: string) => unsupported(path),
  }
}

export function useNotify() {
  return (message: string) => console.info('[notify]', message)
}
