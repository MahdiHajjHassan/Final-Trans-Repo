// A local SVG favicon avoids an automatic browser 404 without remote assets.
export const dynamic = "force-static";
export function GET() {
  return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#175cd3"/><path d="m8 16 5 5 11-12" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>', { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
