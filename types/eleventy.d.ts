declare module '@11ty/eleventy' {
  export interface TemplateExtension {
    key: string
    compile(): unknown
  }

  export interface UserConfig {
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
