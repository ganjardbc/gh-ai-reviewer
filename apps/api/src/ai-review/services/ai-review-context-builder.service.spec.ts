import { AiReviewContextBuilderService } from './ai-review-context-builder.service';
import { ai_review_projects } from '@prisma/client';
import { GitlabMrChange } from '../gitlab/gitlab-api.service';

describe('AiReviewContextBuilderService', () => {
  let service: AiReviewContextBuilderService;

  beforeEach(() => {
    service = new AiReviewContextBuilderService();
  });

  const mockProject: ai_review_projects = {
    id: 'proj-1',
    merchant_id: 'merchant-1',
    name: 'Test Project',
    provider: 'GITLAB',
    gitlab_base_url: 'https://gitlab.com',
    gitlab_project_id: '1234',
    gitlab_project_path: 'org/repo',
    webhook_secret: 'secret',
    access_token: 'token',
    default_branch: 'main',
    is_active: true,
    auto_review_enabled: true,
    review_mode: 'DIFF_ONLY',
    max_changed_files: 3,
    max_patch_chars: 100,
    ignore_patterns: [],
    created_by: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockMrDetail = {
    title: 'Fix auth session vulnerability',
    source_branch: 'bugfix/auth-session',
    target_branch: 'main',
  };

  it('should successfully build context for basic files', () => {
    const changes: GitlabMrChange[] = [
      {
        new_path: 'src/auth/auth.service.ts',
        old_path: 'src/auth/auth.service.ts',
        diff: '@@ -1,3 +1,4 @@\n+console.log("auth check");',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
    ];

    const context = service.build(mockMrDetail, changes, {
      ...mockProject,
      max_patch_chars: 1000,
    });

    expect(context.mrTitle).toBe(mockMrDetail.title);
    expect(context.sourceBranch).toBe(mockMrDetail.source_branch);
    expect(context.targetBranch).toBe(mockMrDetail.target_branch);
    expect(context.changedFilesCount).toBe(1);
    expect(context.truncated).toBe(false);
    expect(context.omittedFilesCount).toBe(0);
    expect(context.files[0].path).toBe('src/auth/auth.service.ts');
  });

  it('should filter files matching default and project ignore patterns', () => {
    const changes: GitlabMrChange[] = [
      {
        new_path: 'src/auth/auth.service.ts',
        old_path: 'src/auth/auth.service.ts',
        diff: 'some diff',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
      {
        new_path: 'node_modules/lodash/index.js',
        old_path: 'node_modules/lodash/index.js',
        diff: 'some diff',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
      {
        new_path: 'src/snapshots/auth.spec.ts.snap',
        old_path: 'src/snapshots/auth.spec.ts.snap',
        diff: 'some diff',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
      {
        new_path: 'src/legacy/old-file.js',
        old_path: 'src/legacy/old-file.js',
        diff: 'some diff',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
    ];

    const context = service.build(mockMrDetail, changes, {
      ...mockProject,
      ignore_patterns: ['src/legacy/**'],
      max_patch_chars: 1000,
    });

    expect(context.changedFilesCount).toBe(1);
    expect(context.files[0].path).toBe('src/auth/auth.service.ts');
  });

  it('should skip files with empty or missing diffs (binary files)', () => {
    const changes: GitlabMrChange[] = [
      {
        new_path: 'src/auth/auth.service.ts',
        old_path: 'src/auth/auth.service.ts',
        diff: '',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
      {
        new_path: 'src/auth/helper.ts',
        old_path: 'src/auth/helper.ts',
        diff: '   \n   ', // whitespace diff should be trimmed to empty and skipped
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
      {
        new_path: 'src/auth/valid.ts',
        old_path: 'src/auth/valid.ts',
        diff: 'valid diff',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
    ];

    const context = service.build(mockMrDetail, changes, {
      ...mockProject,
      max_patch_chars: 1000,
    });

    expect(context.changedFilesCount).toBe(1);
    expect(context.files[0].path).toBe('src/auth/valid.ts');
  });

  it('should enforce max_changed_files cap and count omitted files', () => {
    const changes: GitlabMrChange[] = [
      {
        new_path: 'f1.ts',
        old_path: 'f1.ts',
        diff: 'diff1',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
      {
        new_path: 'f2.ts',
        old_path: 'f2.ts',
        diff: 'diff2',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
      {
        new_path: 'f3.ts',
        old_path: 'f3.ts',
        diff: 'diff3',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
      {
        new_path: 'f4.ts',
        old_path: 'f4.ts',
        diff: 'diff4',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
    ];

    const context = service.build(mockMrDetail, changes, {
      ...mockProject,
      max_changed_files: 2,
      max_patch_chars: 1000,
    });

    expect(context.changedFilesCount).toBe(2);
    expect(context.omittedFilesCount).toBe(2);
    expect(context.files[0].path).toBe('f1.ts');
    expect(context.files[1].path).toBe('f2.ts');
  });

  it('should truncate individual file diff and set truncated flag when max_patch_chars limit is exceeded', () => {
    const changes: GitlabMrChange[] = [
      {
        new_path: 'f1.ts',
        old_path: 'f1.ts',
        diff: '1234567890', // 10 chars
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
      {
        new_path: 'f2.ts',
        old_path: 'f2.ts',
        diff: '1234567890', // 10 chars
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
      {
        new_path: 'f3.ts',
        old_path: 'f3.ts',
        diff: '1234567890',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
    ];

    const context = service.build(mockMrDetail, changes, {
      ...mockProject,
      max_patch_chars: 15,
    });

    expect(context.truncated).toBe(true);
    expect(context.changedFilesCount).toBe(2);
    expect(context.files[0].diff).toBe('1234567890');
    expect(context.files[1].diff).toBe(
      '12345\n[DIFF TRUNCATED at maxPatchChars limit]',
    );
    expect(context.totalPatchChars).toBe(30);
  });
});
