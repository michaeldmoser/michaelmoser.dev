import { jsxToString } from "jsx-async-runtime";

export async function renderTsx<D>(
  template: (data: D) => JSX.Element | Promise<JSX.Element>,
  data: D,
): Promise<string> {
  return await jsxToString(await template(data));
}

export const tsxExtension = {
  key: "11ty.js" as const,
  compile() {
    return async function (
      this: { defaultRenderer(data: unknown): Promise<unknown> },
      data: unknown,
    ): Promise<string> {
      return await renderTsx(
        (d) => this.defaultRenderer(d) as Promise<JSX.Element>,
        data,
      );
    };
  },
};
