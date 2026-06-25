import { ReviewContext } from '../../services/ai-review-context-builder.service';

export function renderUserPrompt(context: ReviewContext): string {
  let truncationWarning = '';
  if (context.truncated) {
    truncationWarning += `\nNOTE: The diff was truncated due to character limit. Only the first portion is shown.`;
  }
  if (context.omittedFilesCount && context.omittedFilesCount > 0) {
    truncationWarning += `\nNOTE: ${context.omittedFilesCount} files were omitted due to maxChangedFiles limit.`;
  }

  let fileSections = '';
  for (const file of context.files) {
    let fileHeader = `### File: ${file.path}\n`;
    if (file.isNewFile) {
      fileHeader += '[NEW FILE]\n';
    } else if (file.isDeletedFile) {
      fileHeader += '[DELETED FILE]\n';
    } else if (file.isRenamedFile) {
      fileHeader += `[RENAMED from ${file.oldPath || 'unknown'}]\n`;
    }

    fileSections += `${fileHeader}\n\`\`\`diff\n${file.diff}\n\`\`\`\n\n`;
  }

  return `Review the following Merge Request diff.

MR Title: ${context.mrTitle}
Source Branch: ${context.sourceBranch} → ${context.targetBranch}
Changed Files (included): ${context.changedFilesCount}${truncationWarning}

---

${fileSections.trim()}

---

Return your response as a single JSON object matching the schema exactly. No other text.`;
}
