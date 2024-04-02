import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: [
        'test-setup.ts'
    ],
    unstubEnvs: true,
    unstubGlobals: true,
    restoreMocks: true,
    mockReset: true,
  },
});
