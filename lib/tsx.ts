import { jsxToString } from "jsx-async-runtime";

export async function renderTsx<D>(
  template: (data: D) => JSX.Element | Promise<JSX.Element>,
  data: D,
): Promise<string> {
  return await jsxToString(await template(data));
}
