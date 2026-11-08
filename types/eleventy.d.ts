declare module '@11ty/eleventy' {
  export interface TemplateExtension {
    key: string
    compile(): unknown
  }

  export interface UserConfig {
    addTemplateFormats(formats: string): void
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
