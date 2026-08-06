/// <reference types="vite/client" />

// Declarations for Vue SFCs
declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Allow importing CSS/SCSS as side-effect modules in TS
declare module '*.css'
declare module '*.scss'

// Vite's import.meta.env typing - include any VITE_ variables used by the app
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly BASE_URL?: string
  readonly MODE?: string
  // add more env vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
