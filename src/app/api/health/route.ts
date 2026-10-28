import { readiness } from "@/backend/database/readiness";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await readiness(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
