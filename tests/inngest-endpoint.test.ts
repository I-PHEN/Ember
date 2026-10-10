import { expect, test } from "bun:test";

async function inspectEndpoint(dev: boolean) {
  const child = Bun.spawn([process.execPath, "--eval", `
    import { GET } from "./src/app/api/inngest/route";
    import { NextRequest } from "next/server";
    const response = await GET(new NextRequest("http://localhost/api/inngest"), { params: Promise.resolve({}) });
    const body = await response.json();
    console.log(JSON.stringify({ status: response.status, functions: body.function_count }));
  `], { env: { ...process.env, INNGEST_DEV: dev ? "1" : "0", INNGEST_SIGNING_KEY: "" }, stdout: "pipe", stderr: "pipe" });
  const output = await new Response(child.stdout).text();
  expect(await child.exited).toBe(0);
  return JSON.parse(output.trim());
}

test("the Inngest endpoint registers both workflows and generation's failure handler", async () => {
  const body = await inspectEndpoint(true);
  expect(body.status).toBe(200);
  expect(body.functions).toBe(3);
});

test("cloud discovery fails closed when signing credentials are missing", async () => {
  expect((await inspectEndpoint(false)).status).toBe(500);
});
