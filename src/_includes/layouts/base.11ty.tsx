import { html } from "jsx-async-runtime";

export default function base(data: { content: string; title?: string }) {
  return (
    <>
      {html("<!doctype html>")}
      <html>
        <head>
          <title>{data.title}</title>
        </head>
        <body>
          <main>{html(data.content)}</main>
        </body>
      </html>
    </>
  );
}
