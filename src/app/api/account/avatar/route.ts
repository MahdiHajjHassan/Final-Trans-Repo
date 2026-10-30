import { withServices } from "@/backend/services";
import { createAvatarHandlers } from "@/backend/modules/profiles/avatar.controller";

// PUT /api/account/avatar: replace only the caller's avatar.
export function PUT(request: Request) {
  return withServices((s) => createAvatarHandlers(s.avatars, s.auth, s.config).put(request));
}
// DELETE /api/account/avatar: restore the default image.
export function DELETE(request: Request) {
  return withServices((s) => createAvatarHandlers(s.avatars, s.auth, s.config).remove(request));
}
