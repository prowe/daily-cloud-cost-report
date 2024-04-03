import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: 'happy-dom',
    unstubEnvs: true,
    unstubGlobals: true,
    restoreMocks: true,
    mockReset: true,
  },
});
