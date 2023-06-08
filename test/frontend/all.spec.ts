import { test, expect, Page, Route } from "@playwright/test";
import assert from "node:assert";

type Req = {
  method: string;
  pathname: string;
  body: unknown;
};
function getReq(route: Route): Req {
  const request = route.request();
  const method = request.method();
  const url = new URL(request.url());
  const pathname = url.pathname;
  const body = request.postDataJSON();
  return { method, pathname, body };
}
async function trackApi(page: Page): Promise<Req[]> {
  const requests: Req[] = [];
  // route は後に設定されたものが先にハンドリングされる（https://github.com/microsoft/playwright/issues/7394）
  // trackApi() では page.route(), mockApi() では context.route() を使うことにより、
  // mockApi() の設定に上書きされないようにする。
  await page.route("/api/**", async (route) => {
    requests.push(getReq(route));
    await route.fallback();
  });
  return requests;
}
async function mockApi(
  page: Page,
  method: string,
  path: string,
  status: number,
  body: any
): Promise<Req[]> {
  const requests: Req[] = [];
  await page.context().route(path, async (route) => {
    const req = getReq(route);
    if (req.method === method) {
      requests.push(req);
      await route.fulfill({
        status,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } else {
      await route.fallback();
    }
  });
  return requests;
}
async function assertGuest(page: Page) {
  await expect(page.getByText(/sign ?up/i)).toBeVisible();
  await expect(page.getByText(/log ?in/i)).toBeVisible();
  await expect(page.getByText(/log ?out/i)).not.toBeVisible();
}
async function assertLoggedIn(page: Page) {
  await expect(page.getByText(/sign ?up/i)).not.toBeVisible();
  await expect(page.getByText(/log ?in/i)).not.toBeVisible();
  await expect(page.getByText(/log ?out/i)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => console.log(msg.text()));
});
test("guest", async ({ page }) => {
  await mockApi(page, "GET", "/api/session", 200, null);
  await page.goto("/");
  await assertGuest(page);
});
test("logged in", async ({ page }) => {
  await mockApi(page, "GET", "/api/session", 200, { name: "test" });
  await page.goto("/");
  await assertLoggedIn(page);
});
test("publish", async ({ page }) => {
  const userName = "test";
  const contentId = "id";
  await mockApi(page, "GET", "/api/session", 200, { name: userName });
  const reqs = await mockApi(page, "POST", "/api/contents/*", 200, {
    id: contentId,
    author: userName,
    settings: { objects: [] },
    output: {
      background: "#000",
      spinner: { speed: 1, vertices: [{ x: 2, y: 2 }] },
      objects: [],
    },
    image: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await page.goto("/");
  await assertLoggedIn(page);
  await expect(page.getByText(/^publish/i)).not.toBeVisible();
  await page.getByText(/^start/i).click();
  await page.getByText(/^publish/i).click();
  await expect(page).toHaveURL(
    new RegExp(`\\/contents\\/${userName}\\/${contentId}`)
  );
  await assertLoggedIn(page);
  assert.strictEqual(reqs.length, 1);
  assert(reqs[0].pathname === `/api/contents/${userName}`);
  assert(reqs[0].body != null);
});
test("content (self)", async ({ page }) => {
  const userName = "test";
  const authorName = userName;
  const contentId = "id";
  await mockApi(page, "GET", "/api/session", 200, { name: userName });
  const gets = await mockApi(page, "GET", "/api/contents/*/*", 200, {
    id: contentId,
    author: authorName,
    settings: { objects: [] },
    output: {
      background: "#000",
      spinner: {
        speed: 1,
        vertices: [
          { x: 0, y: 1 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      },
      objects: [],
    },
    image: "x",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await page.goto(`/contents/${authorName}/${contentId}/edit`);
  await page.waitForResponse("/api/session");
  await assertLoggedIn(page);

  const puts = await mockApi(page, "PUT", "/api/contents/*/*", 200, {
    id: contentId,
    author: authorName,
    settings: { objects: [] },
    output: {
      background: "#000",
      spinner: {
        speed: 1,
        vertices: [
          { x: 0, y: 1 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      },
      objects: [],
    },
    image: "x",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await page.getByText(/^publish/i).click();
  await expect(page).toHaveURL(
    new RegExp(`\\/contents\\/${authorName}\\/${contentId}/edit`)
  );
  await assertLoggedIn(page);
  assert.strictEqual(gets.length, 1);
  assert(gets[0].pathname === `/api/contents/${authorName}/${contentId}`);
  assert.strictEqual(puts.length, 1);
  assert(puts[0].pathname === `/api/contents/${authorName}/${contentId}`);
  assert(puts[0].body != null);
});
test("content (someone)", async ({ page }) => {
  const userName = "test";
  const authorName = "other";
  const contentId = "id";
  await mockApi(page, "GET", "/api/session", 200, { name: userName });
  const gets = await mockApi(page, "GET", "/api/contents/*/*", 200, {
    id: contentId,
    author: authorName,
    settings: { objects: [] },
    output: {
      background: "#000",
      spinner: {
        speed: 1,
        vertices: [
          { x: 0, y: 1 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      },
      objects: [],
    },
    image: "x",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await page.goto(`/contents/${authorName}/${contentId}/edit`);
  await page.waitForResponse("/api/session");
  await assertLoggedIn(page);
  await expect(page.getByText(/^publish/i)).not.toBeVisible();
});
test("content (guest)", async ({ page }) => {
  const authorName = "test";
  const contentId = "id";
  await mockApi(page, "GET", "/api/session", 200, null);
  const gets = await mockApi(page, "GET", "/api/contents/*/*", 200, {
    id: contentId,
    author: authorName,
    settings: { objects: [] },
    output: {
      background: "#000",
      spinner: {
        speed: 1,
        vertices: [
          { x: 0, y: 1 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      },
      objects: [],
    },
    image: "x",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await page.goto(`/contents/${authorName}/${contentId}/edit`);
  await page.waitForResponse("/api/session");
  await assertGuest(page);
  await expect(page.getByText(/^publish/i)).not.toBeVisible();
  assert.strictEqual(gets.length, 1);
  assert(gets[0].pathname === `/api/contents/${authorName}/${contentId}`);
});
test("content (not found)", async ({ page }) => {
  const authorName = "test";
  const contentId = "id";
  await mockApi(page, "GET", "/api/session", 200, null);
  const gets = await mockApi(page, "GET", "/api/contents/*/*", 200, null);
  await page.goto(`/contents/${authorName}/${contentId}/edit`);
  await page.waitForResponse("/api/session");
  await assertGuest(page);
  await expect(page.getByText(/^not found/i)).toBeVisible();
  assert.strictEqual(gets.length, 1);
  assert(gets[0].pathname === `/api/contents/${authorName}/${contentId}`);
});
test("gallery", async ({ page }) => {
  const userName = "test";
  await mockApi(page, "GET", "/api/session", 200, { name: userName });
  const reqs = await mockApi(page, "GET", "/api/contents/*", 200, []);
  await page.goto(`/contents/${userName}`);
  await expect(page.getByText(/gallery/i)).toBeVisible();
  await expect(page.getByText(/none/i)).toBeVisible();
  assert.strictEqual(reqs.length, 1);
  assert(reqs[0].pathname === `/api/contents/${userName}`);
});
test("gallery (guest)", async ({ page }) => {
  const userName = "test";
  await mockApi(page, "GET", "/api/session", 200, null);
  const reqs = await mockApi(page, "GET", "/api/contents/*", 200, []);
  await page.goto(`/contents/${userName}`);
  await expect(page.getByText(/gallery/i)).toBeVisible();
  await expect(page.getByText(/none/i)).toBeVisible();
  assert.strictEqual(reqs.length, 1);
  assert(reqs[0].pathname === `/api/contents/${userName}`);
});
test("account", async ({ page }) => {
  const userName = "test";
  await mockApi(page, "GET", "/api/session", 200, { name: userName });
  const reqs = await mockApi(page, "GET", "/api/contents/*", 200, []);
  await page.goto(`/account`);
  await expect(page.getByText(/gallery/i)).toBeVisible();
  await expect(page.getByText(/none/i)).toBeVisible();
  assert.strictEqual(reqs.length, 1);
  assert(reqs[0].pathname === `/api/contents/${userName}`);
});
test("account (guest)", async ({ page }) => {
  await mockApi(page, "GET", "/api/session", 200, null);
  const reqs = await mockApi(page, "GET", "/api/contents/*", 200, []);
  await page.goto(`/account`);
  await page.waitForURL("/");
  assert.strictEqual(reqs.length, 0);
});
test("log out", async ({ page }) => {
  await mockApi(page, "GET", "/api/session", 200, { name: "test" });
  await mockApi(page, "DELETE", "/api/session", 200, undefined);
  await page.goto("/");
  await assertLoggedIn(page);
  await mockApi(page, "GET", "/api/session", 200, null);
  await page.getByText(/log ?out/i).click();
  await assertGuest(page);
});
