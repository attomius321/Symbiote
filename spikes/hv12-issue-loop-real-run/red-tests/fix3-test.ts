
describe('a stopped workspace that goes on (HV12)', () => {
  // HV12's real run: Hive stopped two writers (a refused host); the person allowed the host and
  // sent each a message; Hive's rounds went on, a request opened and merged, while each issue kept
  // "symbiote: stopped" and "Symbiote stopped work on this" for 6 to 7 minutes.
  const at = '2026-11-14T13:01:10Z';

  it('is said on its issue: working again, after a stop', () => {
    expect(
      answerOfHiveEvent('rounds-again', { prompt: at, after: 'stuck' }, { branch: 'b', at }),
    ).toEqual({ step: 'resumed', branch: 'b', at });
  });

  it('a message in the middle of the rounds says nothing', () => {
    expect(answerOfHiveEvent('rounds-again', { prompt: at }, { branch: 'b', at })).toBeNull();
  });
});
