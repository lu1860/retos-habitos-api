import assert from "node:assert/strict";
import { it } from "node:test";
import { createSupabaseImageStorage } from "../src/infrastructure/config/supabase.ts";

it("valida la configuración de Supabase sin mostrar valores ni hacer peticiones", (t) => {
  const names = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_STORAGE_BUCKET"] as const;
  const previous = names.map((name) => process.env[name]);
  t.after(() => {
    names.forEach((name, index) => {
      const value = previous[index];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    });
  });
  const valid = () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "test-secret-do-not-expose";
    process.env.SUPABASE_STORAGE_BUCKET = "retos";
  };
  for (const name of names) {
    valid();
    process.env[name] = " ";
    assert.throws(createSupabaseImageStorage, /Falta configurar/);
  }
  for (const url of [
    "invalid",
    "http://example.test",
    "https://user:private@example.test",
    "https://example.test?secret=private",
  ]) {
    valid();
    process.env.SUPABASE_URL = url;
    assert.throws(createSupabaseImageStorage, (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /URL HTTPS/);
      assert.ok(!error.message.includes("private"));
      return true;
    });
  }
  valid();
  process.env.SUPABASE_STORAGE_BUCKET = "otro";
  assert.throws(createSupabaseImageStorage, /debe ser retos/);
  valid();
  const storage = createSupabaseImageStorage();
  assert.equal(typeof storage.upload, "function");
  assert.equal(typeof storage.getPublicUrl, "function");
});
