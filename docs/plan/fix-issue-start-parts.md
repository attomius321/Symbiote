# Fix — A take whose answer fills other kinds' parts starts

[Index](../PLAN.md) · Found by [HV12's real run](../journal/hv12-issue-loop-real-run.md)

**Status:** planned (2026-11-14) by the spike `spike/hv12-issue-loop-real-run`. Not started.

**Kind** fix · **Branch** `fix/issue-start-parts` · **Size** S · **Depends on** none

## The brief

**What happens**: Start in Hive, and Nucleus's `start_from_issue`, refuse every take the real
classifier wrote: `POST /api/issues/1/start` → 400, "a fix has no "What is known"". HV12's run
had 6 takes on Opus at high, prompt p2, and each filled a part its kind does not have:

| Take | Kind | Parts outside the kind |
|---|---|---|
| issue 1 | fix | `known`, `outOfScope` |
| issue 2 | feature | `known` |
| issue 8 | fix | `known`, `outOfScope` |
| issue 3, classified again | refactor | `known` |
| issue 1, classified again | fix | `known`, `outOfScope` |
| issue 2, classified again | feature | `reproduce`, `known` |

The text in them matters: issue 1's `known` held "Expected result: `5400000`, the same as
`parse('1h30m')`".

**How to reproduce**: classify any real issue that takes, then Start in Hive. Or run the test
below.

**Where to look**:
- `packages/cli/src/issue-start.ts:176-179`: the request keeps every part with text. Its comment
  says "the other kinds' come empty", which the fake answers made true and Opus does not.
- `packages/cli/src/workspace-start.ts:226-231` (`workOf`): a part outside `partsOf(kind)` is
  refused.
- `packages/cli/src/workspace-brief.ts:39-70` (`KINDS`): a fix has `happens`, `reproduce`,
  `where`, `notes`; a feature `goal`, `where`, `outOfScope`, `notes`; a refactor `restructure`,
  `where`, `outOfScope`, `notes`.

**Out of scope**: the classifier's prompt and schema (asking it to fill only the kind's parts helps
but is not a guard); `start()`'s refusal of a person's own request, which stays.

**Done when**: a take whose answer fills parts of other kinds starts, with only its kind's parts in
the request. The other parts' text is kept in Notes under its heading ("What is known: …"). The
workspace's brief holds everything the record's brief shows.

## Approach

`startFromIssue` builds the parts from `partsOf(answer.kind)`. Each other part with text is added
to `notes`, after the classifier's own notes, as `<heading>: <text>`. If `notes` would pass the
brief's limit, the start refuses with words, as `start()` does for a brief over 20,000 characters.

## The failing test

Added to `packages/cli/test/issue-start.test.ts` (imports `partsOf` from `workspace-brief.js` and
`workOf` from `workspace-start.js`); run red on HV12's branch: `expected [Function] to not throw
an error but 'FeatureRefused: a fix has no "What is…' was thrown`.

```ts
describe('startFromIssue: a take with parts of other kinds (HV12)', () => {
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
    expect(() => workOf(request)).not.toThrow();
    expect(Object.keys(request.parts ?? {}).every((p) => partsOf('fix').includes(p as never))).toBe(true);
    expect(request.parts?.notes).toContain("Expected result: `5400000`, the same as `parse('1h30m')`.");
    expect(request.parts?.notes).toContain('No new dependencies and no CI or release changes.');
  });
});
```

## Verification

The test above; HV10b's start tests unchanged; `pnpm check`, `pnpm build`; the e2e of Start in
Hive (`issues-classify.spec.ts`, `issues-answered.spec.ts`). Then HV12's run starts its takes
without the hand edit.
