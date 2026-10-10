export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !specifier.endsWith('.ts')) {
    try {
      return await nextResolve(new URL(`${specifier}.ts`, context.parentURL).href, context)
    } catch {
      // Fall through to Node's default resolution for non-TypeScript imports.
    }
  }
  return nextResolve(specifier, context)
}
