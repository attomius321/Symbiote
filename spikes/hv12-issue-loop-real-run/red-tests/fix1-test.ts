
describe('startFromIssue: a take with parts of other kinds (HV12)', () => {
  // HV12's real run: Opus filled "What is known" and "Out of scope" on a fix (issue #1 of the
  // scratch repository); every real take of the run carried a part its kind does not have.
  const REAL = {
    ...TAKE,
    kind: 'fix' as const,
    parts: {
      ...TAKE.parts,
      happens: "`parse('1h 30m')` throws a TypeError when units are separated by a space.",
      known: "Expected result: `5400000`, the same as `parse('1h30m')`.",
      outOfScope: 'No new dependencies and no CI or release changes.',
    },
  };

  it("starts it: only the kind's parts reach the start, the others' text kept in Notes", async () => {
    const { service, started } = starter({ record: recordOf({ answer: REAL }) });
    await service.start(3, { by: 'page' });
    const request = started[0]!;
    // The start's own check (`workOf`, as `start()` runs it) accepts the request.
    expect(() => workOf(request)).not.toThrow();
    expect(Object.keys(request.parts ?? {}).every((p) => partsOf('fix').includes(p as never))).toBe(true);
    expect(request.parts?.notes).toContain("Expected result: `5400000`, the same as `parse('1h30m')`.");
    expect(request.parts?.notes).toContain('No new dependencies and no CI or release changes.');
  });
});
