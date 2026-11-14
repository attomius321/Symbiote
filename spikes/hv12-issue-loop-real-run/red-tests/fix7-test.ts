// fix-request-merged-while-pushing: append inside packages/cli/test/hive-runner.test.ts's
// describe.each('Hive lands through a %s request (HV8, decisions 788–792)'), after "cannot merge:
// the writer merges main in, the same request updated; it lands once merged".
    it('merged on the forge while the writer merged main in too: landed, not stopped (HV12 again)', async () => {
      const { repo, remote, forge, s } = await requesting();
      const worktree = await s.start('feature/six');
      const runner = s.runner();
      await s.fake.endTurn(worktree, { files: { 'src/a.ts': 'export const a = "six";\n' } });
      await settle(runner, s, () => Promise.resolve(forge.requests.length === 1), 'opened');
      // main moves on the forge, on the same line: the request conflicts; Hive asks the writer.
      repo.write({ 'src/a.ts': 'export const a = "main";\n' });
      repo.commit('M: a is main');
      repo.git('push', '--quiet', 'origin', 'main');
      repo.git('reset', '--quiet', '--hard', 'HEAD~1');
      forge.conflict(12);
      await settle(
        runner,
        s,
        async () => (await readHive(s.where, 'feature/six'))?.merges === 1,
        'the conflict sent',
      );
      // Meanwhile the person resolves the conflict on the forge (HV12 again: #9, 16:37:01).
      const person = tempDir();
      folders.push(person);
      gitIn(person, 'clone', '--quiet', remote, '.');
      gitIn(person, 'checkout', '--quiet', 'feature/six');
      try {
        gitIn(person, 'merge', 'origin/main');
      } catch {
        // the conflict
      }
      writeFileSync(join(person, 'src', 'a.ts'), 'export const a = "main" + "six";\n');
      gitIn(person, 'add', '-A');
      gitIn(person, 'commit', '-qm', "Merge branch 'main' into feature/six");
      gitIn(person, 'push', '--quiet', 'origin', 'feature/six');
      forge.conflict(12, false);
      // The writer merges main in too and ends its turn; Hive takes the turn's end.
      try {
        gitIn(worktree, 'merge', 'main');
      } catch {
        // the conflict
      }
      writeFileSync(join(worktree, 'src', 'a.ts'), 'export const a = "main" + "six";\n');
      gitIn(worktree, 'add', '-A');
      gitIn(worktree, 'commit', '-qm', 'Merge main into feature/six');
      await s.fake.endTurn(worktree);
      await runner.tick();
      expect(await stepOf(s, 'feature/six')).not.toBe('writing');
      // The person merges the request while Hive checks and reviews the writer's merge (16:37:14).
      const merge = forge.merge(12);
      await settle(
        runner,
        s,
        async () => ['landed', 'stuck'].includes((await stepOf(s, 'feature/six')) ?? ''),
        'landed or stopped',
      );
      // Today: its push is refused (fetch first) and Hive stops a workspace whose request merged.
      expect(events(s.where, 'feature/six')).not.toContain('stuck');
      expect(await stepOf(s, 'feature/six')).toBe('landed');
      expect(repo.git('rev-parse', 'main')).toBe(merge);
    }, 30_000);
