// Host-provided modules. The dashboard serves these through an import map
// (`/vendor/*.mjs`), so they are EXTERNAL at build time and resolved at load
// time — never bundled, never installed from npm.
declare module '@kirocrew/app-sdk' {
  export interface AppApi {
    get<T = unknown>(path: string, init?: RequestInit): Promise<T>
    post<T = unknown>(path: string, body?: unknown): Promise<T>
    put<T = unknown>(path: string, body?: unknown): Promise<T>
    patch<T = unknown>(path: string, body?: unknown): Promise<T>
    del<T = unknown>(path: string): Promise<T>
  }

  export function useAppApi(): AppApi
  export function useNotify(): (
    message: string,
    options?: { type?: 'info' | 'success' | 'error' },
  ) => void
}

declare module '@kirocrew/app-sdk/ui' {
  export const Card: import('react').ComponentType<
    import('react').HTMLAttributes<HTMLDivElement>
  >
  export const CardTitle: import('react').ComponentType<
    import('react').HTMLAttributes<HTMLDivElement>
  >
  export const Btn: import('react').ComponentType<
    import('react').ButtonHTMLAttributes<HTMLButtonElement>
  >
  export const StatCard: import('react').ComponentType<{
    label: string
    value: import('react').ReactNode
    sub?: import('react').ReactNode
    accent?: boolean
  }>
  export const ContentSkeleton: import('react').ComponentType<{ rows?: number }>
  export const EmptyState: import('react').ComponentType<{
    icon?: import('react').ReactNode
    title: string
    subtitle?: string
    action?: import('react').ReactNode
  }>
  export const PageHeader: import('react').ComponentType<{
    title: import('react').ReactNode
    subtitle?: string
    actions?: import('react').ReactNode
  }>
}
