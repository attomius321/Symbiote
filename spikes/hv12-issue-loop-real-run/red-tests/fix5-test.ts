
describe("a Hive entry's push, before it reads as landed (HV12)", () => {
  // HV12's real run: the queue set `landed` at 13:11:34.395 and pushed at 13:11:36.601; Hive read
  // the entry 72 ms after the fast-forward and recorded `pushed: false` for a push that went.
  it('is landed only with its push answered', async () => {
    const { repo, shas } = setup();
    const remote = origin(repo);
    writeFileSync(join(remote, 'hooks', 'pre-receive'), '#!/bin/sh\nsleep 1\n', { mode: 0o755 });
    review(repo, 'topic', { head: shas.T, into: 'main' });
    const m = await make(repo);
    await m.enqueue({ branch: 'topic', into: 'main', by: 'hive' });
    let first: Awaited<ReturnType<typeof m.list>>['merges'][number] | undefined;
    while (!first) {
      const [entry] = (await m.list()).merges;
      if (entry?.state === 'landed') first = entry;
      else await new Promise((done) => setTimeout(done, 10));
    }
    expect(first.pushed).toEqual({ ok: true, remote: 'origin' });
    await m.idle();
  }, 20_000);
});
