import { defineConfig } from "tsup";
 
export default defineConfig({
  entry: {
    'index': "src/package/index.ts",
    'make-endpoint-schemas-client-cli': "src/cli/index.ts"
  },
  publicDir: false,
  clean: true,
  target: ['es2020'],
  minify: false,
  dts: true,
  format: ['cjs', 'esm'], // When this changes, update 'type' in package.json 
});