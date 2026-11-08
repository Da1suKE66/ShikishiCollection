import {test, expect, type Page} from "@playwright/test";
import {responsiveLibrary, responsiveMonitoring} from "../fixtures/responsive";

const compact = (page: Page) => page.evaluate(() => matchMedia("(max-width:767px),(max-height:540px) and (max-width:1100px)").matches);
async function openPage(page: Page, id: string) {
  await page.goto(`/#${id}`);
  await expect(page.locator(".loading-page")).toHaveCount(0);
}
test.beforeEach(async ({page, request, baseURL}) => {
  const viewport = page.viewportSize();
  if (viewport && viewport.width > 767 && viewport.height < 540) {
    await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.style.setProperty("--safe-left", "59px");
      document.documentElement.style.setProperty("--safe-right", "59px");
      document.documentElement.style.setProperty("--safe-bottom", "21px");
    }));
  }
  const snapshot = await (await request.get("/api/library")).json();
  const saved = await request.put("/api/library", {
    headers: {Origin: baseURL!}, data: {library: responsiveLibrary(), revision: snapshot.revision},
  });
  expect(saved.ok()).toBeTruthy();
  await page.route("**/api/library", async route => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    await route.fulfill({response, json: {...await response.json(), ...responsiveMonitoring()}});
  });
});

test("all seven populated pages fit the viewport", async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const id of ["overview", "artists", "collections", "benefits", "events", "inbox", "settings"]) {
    await openPage(page, id);
    const dimensions = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth, view: document.documentElement.clientWidth,
      inner: innerWidth,
    }));
    expect(dimensions.page, id).toBeLessThanOrEqual(dimensions.view + 1);
    expect(dimensions.inner, id).toBe(page.viewportSize()!.width);
    await expect(page.locator("main")).toBeVisible();
    if (id === "overview") {
      const text = (await page.locator(".hero p").boundingBox())!;
      const art = (await page.locator(".paper-art").boundingBox())!;
      expect(text.x + text.width <= art.x || art.x + art.width <= text.x || text.y >= art.y + art.height + 4).toBeTruthy();
    }
  }
  expect(errors).toEqual([]);
});

test("artist search finds representative works and aliases", async ({page}) => {
  await openPage(page, "artists");
  const search = page.getByRole("textbox", {name: "搜索画师、代表作或标签"});
  for (const term of ["纸上旅行第1册", "测试别名0"]) {
    await search.fill(term);
    await search.press("Enter");
    await expect(page.locator(".artist-card")).toHaveCount(1);
    await expect(page.getByRole("button", {name: "查看 花与纸 的档案"})).toBeVisible();
  }
  await page.getByRole("button", {name: "清空搜索"}).click();
  await expect(page.locator(".artist-card")).toHaveCount(8);
});

test("a long artist form can save and persist after reload", async ({page, request}) => {
  await openPage(page, "artists");
  await page.getByRole("button", {name: "收录画师", exact: true}).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("画师名", {exact: true}).fill("新收录的示例画师");
  await dialog.getByLabel("私密笔记").fill("使用手机和电脑都能保存的一份笔记。".repeat(20));
  if (await compact(page)) {
    for (const input of await dialog.locator('input:not([type="checkbox"]), textarea, select').all()) {
      expect(await input.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
    }
  }
  await dialog.getByRole("button", {name: "保存记录"}).click();
  await expect(dialog).toHaveCount(0);
  const snapshot = await (await request.get("/api/library")).json();
  expect(snapshot.library.artists.some((a: {name: string}) => a.name === "新收录的示例画师")).toBeTruthy();
  await page.reload();
  await expect(page.getByRole("button", {name: "查看 新收录的示例画师 的档案"})).toBeVisible();
});

test("benefits show the full plan and expose an accessible edit control", async ({page}) => {
  await openPage(page, "benefits");
  const row = page.getByRole("table", {name: "FANBOX 特典列表"}).locator("tbody tr").first();
  await expect(row.getByText("每年 2 月 / 7 月开始，具体日期待公告")).toBeVisible();
  await expect(row.getByText("JPY 3,000 / 10,000，需核对指定档位")).toBeVisible();
  if (await compact(page)) {
    const bounds = await row.getByRole("button").boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }
  await row.getByRole("button").click();
  await expect(page.getByRole("dialog").getByLabel("特典内容")).toHaveValue("连续支援纪念亲签色纸与特别复制原画");
});

test("calendar opens the confirmed event and source logs keep their context", async ({page}) => {
  await openPage(page, "events");
  const day = page.locator(".calendar-grid").getByRole("button", {name: "19", exact: true});
  if (await compact(page)) {
    const bounds = await day.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }
  await day.click();
  await expect(page.getByRole("dialog").getByLabel("展会 / 活动名称")).toHaveValue("纸间示例展会 1");
  await page.getByRole("button", {name: "关闭窗口"}).click();
  await openPage(page, "inbox");
  const row = page.locator(".source-log-row").first();
  await expect(row.getByText("BOOTH", {exact: true})).toBeVisible();
  await expect(row.getByText("读取受限", {exact: true})).toBeVisible();
  await expect(row.locator(".source-check-time")).toContainText("11");
  await expect(row.locator(".source-check-time")).toBeVisible();
});

test("phone navigation traps focus, closes, and survives rotation", async ({page}) => {
  await openPage(page, "artists");
  test.skip(!await compact(page), "Compact navigation is only shown on phones.");
  await page.getByRole("button", {name: "更多页面"}).click();
  const dialog = page.getByRole("dialog", {name: "收藏导航"});
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(e => e.contains(document.activeElement))).toBeTruthy();
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", {name: "更多页面"})).toBeFocused();
  await page.getByRole("button", {name: "打开导航"}).click();
  await dialog.getByRole("button", {name: /展会手帐/}).click();
  await expect(page).toHaveURL(/#events$/);
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", {name: "打开导航"}).click();
  await page.mouse.click(page.viewportSize()!.width - 4, 50);
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", {name: "打开导航"}).click();
  await page.setViewportSize({width: 1440, height: 900});
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("navigation", {name: "主导航", exact: true})).toBeVisible();
});

test("phone editor remains usable with safe areas and a short keyboard viewport", async ({page, request}) => {
  await openPage(page, "collections");
  test.skip(!await compact(page), "Phone-only safe area and short viewport check.");
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--safe-top", "47px");
    document.documentElement.style.setProperty("--safe-bottom", "34px");
  });
  await page.getByRole("button", {name: "新增收藏"}).click();
  await page.getByLabel("收藏名称").fill("手机上新增的色纸");
  await page.setViewportSize({width: 430, height: 440});
  const dialog = page.getByRole("dialog");
  const notes = dialog.getByLabel("收藏故事 / 原始记录");
  await notes.fill("缩短可见区域后仍能填写与保存。".repeat(6));
  await notes.scrollIntoViewIfNeeded();
  const close = dialog.getByRole("button", {name: "关闭窗口"});
  const closeBounds = await close.boundingBox();
  expect(closeBounds!.y).toBeGreaterThanOrEqual(47);
  expect(closeBounds!.y + closeBounds!.height).toBeLessThan(440);
  const save = dialog.getByRole("button", {name: "保存记录"});
  await save.click();
  await expect(dialog).toHaveCount(0);
  const result = await (await request.get("/api/library")).json();
  expect(result.library.collections.some((c: {title: string}) => c.title === "手机上新增的色纸")).toBeTruthy();
});
