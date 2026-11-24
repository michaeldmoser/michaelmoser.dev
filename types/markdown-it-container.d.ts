declare module 'markdown-it-container' {
  interface ContainerToken {
    info: string
    nesting: number
  }

  interface ContainerEnv {
    page: { inputPath: string }
  }

  interface ContainerOptions {
    validate(params: string): boolean
    render(
      tokens: ContainerToken[],
      idx: number,
      options: unknown,
      env: ContainerEnv
    ): string
  }

  const container: (
    md: unknown,
    name: string,
    options: ContainerOptions
  ) => void
  export default container
}
