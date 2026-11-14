
describe("npm's own update check (HV12)", () => {
  // HV12's real run: `npm test` in a repository with a package.json and no lockfile reached
  // registry.npmjs.org for npm's update check; the sandbox refused it and Hive stopped two
  // writers whose tests had passed.
  it('a package.json alone names npm', () => {
    expect(ecosystemsAt(['package.json']).map((e) => e.name)).toEqual(['npm']);
  });

  it("turns npm's and pnpm's update check off in the writer's env", () => {
    const env = JSON.parse(
      issueWriterSettings({
        hooks: HOOKS,
        folder: writerFolder('/c/symbiote', '/w/fix-1'),
        cacheDir: '/c/symbiote',
        hosts: [],
        secrets: [],
        protect: [],
      }),
    ).env as Record<string, string>;
    expect(env.npm_config_update_notifier).toBe('false');
  });
});
