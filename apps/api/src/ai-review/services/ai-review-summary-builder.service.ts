import { Injectable } from '@nestjs/common';
import { NormalizedReviewResult, NormalizedReviewFinding } from './ai-review-result-normalizer.service';
import { AiReviewSeverity } from '@prisma/client';

@Injectable()
export class AiReviewSummaryBuilderService {
  build(result: NormalizedReviewResult): string {
    const { summary, riskLevel, findings, suggestedTests } = result;

    const lines: string[] = [];

    // Header
    lines.push('## AI Review Summary\n');
    lines.push(`**Risk Level**: ${riskLevel}\n`);
    if (summary) {
      lines.push(`${summary}\n`);
    }

    lines.push('---');

    // Findings section
    if (findings.length === 0) {
      lines.push('\nNo issues were found. Code looks clean!\n');
    } else {
      lines.push(`\n### Findings (${findings.length} total)\n`);

      // Sort findings by severity: HIGH first, then MEDIUM, then LOW
      const severityOrder: Record<AiReviewSeverity, number> = {
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
      };

      const sortedFindings = [...findings].sort((a, b) => {
        return (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99);
      });

      const emojiMap: Record<AiReviewSeverity, string> = {
        HIGH: '🔴',
        MEDIUM: '🟡',
        LOW: '🔵',
      };

      for (let i = 0; i < sortedFindings.length; i++) {
        const finding = sortedFindings[i];
        const emoji = emojiMap[finding.severity] || '⚪';
        const categoryCap = this.capitalize(finding.category);

        lines.push(`#### ${emoji} ${finding.severity} — ${categoryCap}\n`);

        const fileInfo = finding.filePath ? ` (\`${finding.filePath}\`)` : '';
        lines.push(`**[${categoryCap}] ${finding.title}**${fileInfo}`);

        if (finding.line !== null && finding.line !== undefined) {
          lines.push(`> Line ${finding.line}\n`);
        } else {
          lines.push(''); // spacing if no line
        }

        lines.push(`${finding.description}\n`);

        if (finding.suggestion) {
          lines.push(`**Suggestion**: ${finding.suggestion}\n`);
        }

        if (finding.confidence !== null && finding.confidence !== undefined) {
          lines.push(`Confidence: ${finding.confidence.toFixed(2)}\n`);
        }

        if (i < sortedFindings.length - 1) {
          lines.push('---');
        }
      }
    }

    lines.push('---');

    // Suggested Tests section
    if (suggestedTests && suggestedTests.length > 0) {
      lines.push('\n### Suggested Tests\n');
      for (const test of suggestedTests) {
        lines.push(`- ${test}`);
      }
      lines.push('\n---');
    }

    // Footer
    const timestamp = new Date().toUTCString();
    lines.push(`*Reviewed by AI Reviewer V1 · ${timestamp}*`);

    return lines.join('\n');
  }

  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}
