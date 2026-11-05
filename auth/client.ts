import { createAuthClient } from "@neon/auth/next";

declare global {
  interface Window {
    MANDALARIA_AUTH: ReturnType<typeof createAuthClient>;
  }
}

window.MANDALARIA_AUTH = createAuthClient();
