import { Injectable } from '@nestjs/common';
import { ai_review_projects } from '@prisma/client';
import { GitlabMrChange } from '../gitlab/gitlab-api.service';
import { isIgnored } from '../utils/glob-matcher';

export const DEFAULT_IGNORE_PATTERNS = [
  'dist/**',
  'build/**',
  'coverage/**',
  'node_modules/**',
  '*.lock',
  'pnpm-lock.yaml',
  'yarn.lock',
  'package-lock.json',
  '**/__snapshots__/**',
  '*.snap',
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.gif',
  '*.svg',
  '*.ico',
  '*.woff',
  '*.woff2',
  '*.ttf',
  '*.eot',
];

export interface ReviewContextFile {
  path: string;
  isNewFile: boolean;
  isDeletedFile: boolean;
  isRenamedFile: boolean;
  oldPath?: string;
  diff: string;
}

export interface ReviewContext {
  mrTitle: string;
  sourceBranch: string;
  targetBranch: string;
  changedFilesCount: number;
  totalPatchChars: number;
  truncated: boolean;
  files: ReviewContextFile[];
  omittedFilesCount: number;
}

@Injectable()
export class AiReviewContextBuilderService {
  build(
    mrDetail: { title: string; source_branch: string; target_branch: string },
    changes: GitlabMrChange[],
    project: ai_review_projects,
  ): ReviewContext {
    // 1. Get ignore patterns
    let projectIgnorePatterns: string[] = [];
    if (project.ignore_patterns && Array.isArray(project.ignore_patterns)) {
      projectIgnorePatterns = project.ignore_patterns as string[];
    }
    const allIgnorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...projectIgnorePatterns];

    // 2. Filter changes
    const filteredChanges = changes.filter((change) => {
      // Exclude ignored paths
      if (isIgnored(change.new_path, allIgnorePatterns)) {
        return false;
      }
      // Exclude binary files (empty/missing diff)
      if (!change.diff || change.diff.trim() === '') {
        return false;
      }
      return true;
    });

    const maxChangedFiles = project.max_changed_files ?? 30;
    const maxPatchChars = project.max_patch_chars ?? 120000;

    // 3. Apply file count cap
    const cappedChanges = filteredChanges.slice(0, maxChangedFiles);
    const omittedFilesCount = Math.max(0, filteredChanges.length - maxChangedFiles);

    // 4. Construct files and handle patch char limit truncation
    const files: ReviewContextFile[] = [];
    let currentChars = 0;
    let truncated = false;
    let totalPatchChars = 0;

    // Calculate total patch chars of capped changes BEFORE truncation
    for (const change of cappedChanges) {
      totalPatchChars += (change.diff || '').length;
    }

    for (const change of cappedChanges) {
      if (truncated) {
        break; // skip any remaining files if already truncated
      }

      const diffText = change.diff || '';
      const remainingSpace = maxPatchChars - currentChars;

      if (remainingSpace <= 0) {
        truncated = true;
        break;
      }

      if (diffText.length > remainingSpace) {
        // Truncate this file's diff
        const truncatedDiff = diffText.substring(0, remainingSpace) + '\n[DIFF TRUNCATED at maxPatchChars limit]';
        files.push({
          path: change.new_path,
          isNewFile: change.new_file,
          isDeletedFile: change.deleted_file,
          isRenamedFile: change.renamed_file,
          oldPath: change.old_path,
          diff: truncatedDiff,
        });
        currentChars += truncatedDiff.length;
        truncated = true;
      } else {
        files.push({
          path: change.new_path,
          isNewFile: change.new_file,
          isDeletedFile: change.deleted_file,
          isRenamedFile: change.renamed_file,
          oldPath: change.old_path,
          diff: diffText,
        });
        currentChars += diffText.length;
      }
    }

    return {
      mrTitle: mrDetail.title,
      sourceBranch: mrDetail.source_branch,
      targetBranch: mrDetail.target_branch,
      changedFilesCount: files.length,
      totalPatchChars,
      truncated,
      files,
      omittedFilesCount,
    };
  }
}
