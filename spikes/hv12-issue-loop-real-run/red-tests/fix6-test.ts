
describe("the queue's own ready, a moment before it lands (HV12)", () => {
  // HV12's real run: the queue set the entry `ready` after its check passed and before it landed
  // it (`merge-run.ts` 253–264); Hive's look in that window took it for a refused checkout (770)
  // and landed it too. Two fast-forwards and two pushes of main: the second was refused ("cannot
  // lock ref") and its words were recorded as the landing's push.
  it('is not a refused checkout: Hive lands nothing itself', async () => {
    const repo = repository(['true']);
    const s = await setup(repo, { land: true });
    const queue = s.merges!;
    // The window, held open: the queue does not run, and its entry reads as the queue writes it
    // at its check's end, `ready` with no word of a refusal.
    const enqueue = queue.enqueue.bind(queue);
    queue.enqueue = (request) => enqueue(request, { start: false });
    const list = queue.list.bind(queue);
    queue.list = async () => {
      const read = await list();
      return {
        ...read,
        merges: read.merges.map((e) => (e.state === 'queued' ? { ...e, state: 'ready' as const } : e)),
      };
    };
    const land = vi.spyOn(queue, 'land');
    await s.turn(true);
    const worktree = await s.start('feature/once');
    const runner = s.runner();
    await s.fake.endTurn(worktree, { files: { 'once.txt': 'once\n' } });
    await settle(
      runner,
      s,
      async () => (await readHive(s.where, 'feature/once'))?.landings?.at(-1)?.entry !== undefined,
      'queued',
    );
    await runner.tick();
    await runner.idle();
    expect(land).not.toHaveBeenCalled();
  }, 60_000);
});
