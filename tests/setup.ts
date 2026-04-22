import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./mocks/server";

process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
process.env.META_ACCESS_TOKEN ||= "test-meta-token";
process.env.META_PHONE_NUMBER_ID ||= "123456789";

// Keep backwards compatibility with existing jest-style tests while
// migrating test files gradually to Vitest APIs.
(globalThis as any).jest = vi;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});
