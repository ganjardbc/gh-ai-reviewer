import { mapGitlabWebhook } from './gitlab-mapper';

describe('mapGitlabWebhook', () => {
  it('should map a raw GitLab merge request payload correctly', () => {
    const payload = {
      object_kind: 'merge_request',
      project: {
        id: 1234,
        name: 'Test Project',
      },
      object_attributes: {
        action: 'open',
        iid: 42,
        id: 9999,
        title: 'Draft: Fix typing issues',
        url: 'https://gitlab.com/test/project/-/merge_requests/42',
        source_branch: 'fix/types',
        target_branch: 'main',
        last_commit: {
          id: 'commitsha123',
        },
        diff_refs: {
          base_sha: 'basesha456',
        },
      },
    };

    const result = mapGitlabWebhook(payload);

    expect(result).toEqual({
      eventType: 'merge_request',
      action: 'open',
      gitlabProjectId: '1234',
      mrIid: 42,
      mrId: 9999,
      mrTitle: 'Draft: Fix typing issues',
      mrUrl: 'https://gitlab.com/test/project/-/merge_requests/42',
      sourceBranch: 'fix/types',
      targetBranch: 'main',
      sha: 'commitsha123',
      baseSha: 'basesha456',
    });
  });

  it('should handle partial or missing payload fields gracefully', () => {
    const payload = {};
    const result = mapGitlabWebhook(payload);

    expect(result.eventType).toBe('merge_request');
    expect(result.action).toBe('open');
    expect(result.gitlabProjectId).toBe('');
    expect(result.mrIid).toBe(0);
    expect(result.mrId).toBe(0);
  });
});
