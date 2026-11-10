declare module '@11ty/eleventy' {
  export interface TemplateExtension {
    key: string
    compile(): unknown
  }

  export interface CollectionItem {
    inputPath: string
    url: string
    date: Date
    data: Record<string, unknown>
  }

  export interface CollectionApi {
    getAll(): CollectionItem[]
  }

  export interface UserConfig {
    addCollection(
      name: string,
      callback: (collectionApi: CollectionApi) => unknown[]
    ): void
    addPassthroughCopy(path: string): void
    addTemplateFormats(formats: string): void
    addGlobalData(name: string, data: () => unknown): void
    addExtension(extension: string, options: TemplateExtension): void
  }

  export interface BuildResult {
    url: string
    inputPath: string
    outputPath: string
    content: string
  }

  export default class Eleventy {
    constructor(
      input?: string,
      output?: string,
      options?: { configPath?: string }
    )
    toJSON(): Promise<BuildResult[]>
  }
}
