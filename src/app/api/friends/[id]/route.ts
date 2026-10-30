import { withServices } from "@/backend/services";
import { createFriendHandlers } from "@/backend/modules/friends/friends.controller";
// PATCH/DELETE /api/friends/:id: accept or remove a relationship belonging to this caller.
export async function PATCH(r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withServices((s) => createFriendHandlers(s.friends, s.auth, s.config).accept(r, id));
}
export async function DELETE(r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withServices((s) => createFriendHandlers(s.friends, s.auth, s.config).remove(r, id));
}
