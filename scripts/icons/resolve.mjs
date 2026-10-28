// Lets Node run the game's TypeScript straight from src/ (node --import ./scripts/icons/resolve.mjs …): the game imports
// its modules without an extension, as Vite allows, and Node wants one.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(spec, ctx, next) {
    try { return next(spec, ctx); } catch (e) {
      if (spec.startsWith('.') && !/\.\w+$/.test(spec)) return next(spec + '.ts', ctx);
      throw e;
    }
  },
});
