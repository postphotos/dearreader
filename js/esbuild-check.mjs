// Lightweight diagnostic to exercise esbuild.transform and print results
try {
  const esbuild = await import('esbuild');
  console.log('esbuild version:', esbuild.version || esbuild.default?.version);
  try {
    const result = await esbuild.transform('const x: number = 42; export default x;', { loader: 'ts' });
    console.log('transform succeeded, code length:', result.code?.length || 0);
  } catch (err) {
    console.error('transform error:');
    console.error(err && err.stack ? err.stack : err);
    process.exit(2);
  }
} catch (e) {
  console.error('failed to import esbuild:');
  console.error(e && e.stack ? e.stack : e);
  process.exit(3);
}
