# Fix — A take whose answer fills other kinds' parts starts

[Index](../PLAN.md) · Found by [HV12's real run](../journal/hv12-issue-loop-real-run.md)

**Status:** built, ready for review (2026-11-14). Planned by the spike `spike/hv12-issue-loop-real-run`.

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

## Decisions

1080 was free on `main` and every branch on 2026-11-14 (the brief gives this fix 1080–1081).

| # | Question | Decision | Why |
|---|---|---|---|
| 1080 | Where does a classifier's part go that its take's kind has no place for (a fix's "What is known")? | **To Notes, after the classifier's own notes, as `<heading>: <text>`, in the brief's order: one function (`partsFor`, `workspace-brief.ts`) for the start's request, the record's brief and the classifier's length check. A start whose brief then passes 20,000 characters is refused with words (409)** | Opus filled such parts in 6 of 6 real takes, and their text matters (issue 1's expected result). Dropping it loses the issue's facts; widening a kind's parts changes the start page. One function keeps the brief the card shows the brief the writer gets |

## As built

As planned, with four additions:

- **The record's brief too.** `issueBrief` wrote the brief the card shows from the kind's parts
  only, so issue 1's expected result was missing there as well. It now uses `partsFor`, so the
  card's brief and the workspace's are the same text. The personal check reads that brief, so a
  name in a part of another kind now holds the take, as it would in any other part.
- **The classifier's length check** (`answerMisfit`'s `brief`) counts those parts in Notes. An
  answer that fits the check starts.
- **HV10b's request test changed one line.** Its fixture take (`a01`, Opus at high, HV9a) is
  itself a fix with `known` and `outOfScope`, and the test expected them in the request: the
  bug, against its own comment ("only the kind's own parts with text"). It now filters by
  `partsOf('fix')`; nothing else in HV10b's tests changed.
- **The e2e take is real-shaped.** `issues-start.spec.ts`'s fake take is a fix with `known` and
  `outOfScope`, as Opus writes them; the e2e fakes had left every other part empty, which is why
  no test met the bug. It checks the writer's prompt holds them in Notes.

HV12's records cannot be replayed: the run edited the 6 takes by hand before starting them, so no
record keeps an original answer. The plan's test holds issue 1's text instead.

## Results

See the [journal](../journal/fix-issue-start-parts.md).
