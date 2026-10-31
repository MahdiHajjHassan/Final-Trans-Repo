import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

// Keep our real navigation and inputs. Only replace the Next runtime boundary;
// record the prefetch policy passed to it, alongside its normal anchor props.
vi.mock("next/link", () => ({
  default: ({ prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) =>
    createElement("a", { ...props, "data-prefetch": String(prefetch) }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/en/play",
  useRouter: () => ({ push() {}, refresh() {} }),
}));

import { Navigation } from "@/frontend/layout/Navigation";
import { GameLobby } from "@/frontend/features/games/components/GameLobby";

test("visible public navigation keeps click destinations without speculative prefetch", () => {
  const html = renderToStaticMarkup(createElement(Navigation, { locale: "en" }));
  expect(html).toContain('href="/en/play"');
  expect(html).toContain('href="/en/login"');
  expect(html).toContain('href="/en/register"');
  expect(html.match(/data-prefetch="false"/g)).toHaveLength(3);
  expect(html).toContain('aria-current="page"');
});

test("friend room input rejects malformed codes and accepts either letter case", () => {
  const html = renderToStaticMarkup(createElement(GameLobby, { locale: "en" }));
  const input = html.match(/<input\b[^>]*name="code"[^>]*>/)?.[0];
  expect(input).toBeDefined();
  const pattern = input!.match(/pattern="([^"]+)"/)?.[1];
  expect(pattern, "room-code input must enforce its alphabet before submission").toBeDefined();
  const accepts = new RegExp(`^(?:${pattern})$`);
  for (const code of ["!!!!!!!!", "ABCD0I12", "ABCDO123", "ABCD123", "ABCD12345"])
    expect(accepts.test(code), code).toBe(false);
  for (const code of ["ABCD2345", "abcd2345", "aBcD2345"])
    expect(accepts.test(code), code).toBe(true);
});
