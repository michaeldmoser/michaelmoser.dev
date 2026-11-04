import { describe, it, expect } from "vitest";
import { renderTsx } from "../lib/tsx.ts";

interface PageData {
  title: string;
  body: string;
}

const Layout = ({ title, body }: PageData) => (
  <html>
    <head>
      <title>{title}</title>
    </head>
    <body>
      <h1>{title}</h1>
      <p>{body}</p>
    </body>
  </html>
);

describe("renderTsx", () => {
  it("renders the layout's HTML with the page data values in place", async () => {
    const html = await renderTsx(Layout, {
      title: "Hello",
      body: "Fish & chips",
    });

    expect(html).toContain("<title>Hello</title>");
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<p>Fish &amp; chips</p>");
  });

  it("renders the resolved output of an async component nested in the layout", async () => {
    const Greeting = async ({ name }: { name: string }) => {
      const greeting = await Promise.resolve(`Welcome, ${name}`);
      return <span>{greeting}</span>;
    };
    const AsyncLayout = ({ name }: { name: string }) => (
      <main>
        <Greeting name={name} />
      </main>
    );

    const html = await renderTsx(AsyncLayout, { name: "Ada" });

    expect(html).toContain("<span>Welcome, Ada</span>");
  });
});
