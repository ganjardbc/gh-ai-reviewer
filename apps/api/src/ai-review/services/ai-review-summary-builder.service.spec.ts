import { AiReviewSummaryBuilderService } from './ai-review-summary-builder.service';
import { NormalizedReviewResult } from './ai-review-result-normalizer.service';
import { AiReviewSeverity, AiReviewFindingCategory } from '@prisma/client';

describe('AiReviewSummaryBuilderService', () => {
  let service: AiReviewSummaryBuilderService;

  beforeEach(() => {
    service = new AiReviewSummaryBuilderService();
  });

  it('should render a complete markdown summary with sorted findings and suggested tests', () => {
    const mockResult: NormalizedReviewResult = {
      summary: 'The code is mostly good, but has minor issues.',
      riskLevel: 'MEDIUM',
      findings: [
        {
          filePath: 'src/user.service.ts',
          line: 12,
          severity: AiReviewSeverity.LOW,
          category: AiReviewFindingCategory.MAINTAINABILITY,
          title: 'Unused variable',
          description: 'Variable "x" is declared but never used.',
          suggestion: 'Remove variable "x".',
          confidence: 0.8,
        },
        {
          filePath: 'src/user.controller.ts',
          line: 42,
          severity: AiReviewSeverity.HIGH,
          category: AiReviewFindingCategory.SECURITY,
          title: 'Missing RBAC check',
          description: 'Endpoint lacks permission guard.',
          suggestion: 'Add @RequirePermission().',
          confidence: 0.95,
        },
      ],
      suggestedTests: ['Test access without correct permission returns 403'],
    };

    const summary = service.build(mockResult);

    expect(summary).toContain('## AI Review Summary');
    expect(summary).toContain('**Risk Level**: MEDIUM');
    expect(summary).toContain('The code is mostly good, but has minor issues.');

    // Check sorting: HIGH first, then LOW
    const highIdx = summary.indexOf('🔴 HIGH — Security');
    const lowIdx = summary.indexOf('🔵 LOW — Maintainability');
    expect(highIdx).toBeGreaterThan(-1);
    expect(lowIdx).toBeGreaterThan(-1);
    expect(highIdx).toBeLessThan(lowIdx);

    // Check content details
    expect(summary).toContain(
      '**[Security] Missing RBAC check** (`src/user.controller.ts`)',
    );
    expect(summary).toContain('> Line 42');
    expect(summary).toContain('**Suggestion**: Add @RequirePermission().');
    expect(summary).toContain('Confidence: 0.95');

    // Check tests
    expect(summary).toContain('### Suggested Tests');
    expect(summary).toContain(
      '- Test access without correct permission returns 403',
    );

    // Check footer
    expect(summary).toContain('Reviewed by AI Reviewer V1 ·');
  });

  it('should render zero findings case correctly', () => {
    const mockResult: NormalizedReviewResult = {
      summary: 'All checks passed.',
      riskLevel: 'LOW',
      findings: [],
      suggestedTests: [],
    };

    const summary = service.build(mockResult);

    expect(summary).toContain('**Risk Level**: LOW');
    expect(summary).toContain('No issues were found. Code looks clean!');
    expect(summary).not.toContain('### Findings');
    expect(summary).not.toContain('### Suggested Tests');
  });

  it('should gracefully omit optional fields like line, suggestion, and confidence', () => {
    const mockResult: NormalizedReviewResult = {
      summary: 'Test',
      riskLevel: 'LOW',
      findings: [
        {
          filePath: null,
          line: null,
          severity: AiReviewSeverity.LOW,
          category: AiReviewFindingCategory.BUG,
          title: 'Global bug',
          description: 'A global bug description.',
          suggestion: null,
          confidence: null,
        },
      ],
      suggestedTests: [],
    };

    const summary = service.build(mockResult);

    expect(summary).toContain('**[Bug] Global bug**');
    expect(summary).not.toContain('> Line');
    expect(summary).not.toContain('Suggestion:');
    expect(summary).not.toContain('Confidence:');
  });
});
