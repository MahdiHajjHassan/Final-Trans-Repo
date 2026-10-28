import { readiness } from "@/backend/database/readiness";
export const dynamic = "force-dynamic";

// GET /api/health: check the database tables; a failed readiness check returns 503.
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
