import { AiReviewResultNormalizerService } from './ai-review-result-normalizer.service';
import { BadRequestException } from '@nestjs/common';
import { AiReviewSeverity, AiReviewFindingCategory } from '@prisma/client';

describe('AiReviewResultNormalizerService', () => {
  let service: AiReviewResultNormalizerService;

  beforeEach(() => {
    service = new AiReviewResultNormalizerService();
  });

  it('should parse and normalize a valid LLM response', () => {
    const validJson = JSON.stringify({
      summary: 'This MR is generally well-structured but has a security flaw.',
      riskLevel: 'medium',
      findings: [
        {
          severity: 'high',
          category: 'security',
          filePath: 'src/controllers/user.controller.ts',
          line: 42,
          title: 'Missing permission check',
          description: 'Endpoint should have permission decorator.',
          suggestion: 'Add @RequirePermission()',
          confidence: 0.95,
        },
      ],
      suggestedTests: ['Test unauthenticated access returns 401'],
    });

    const result = service.normalize(validJson);

    expect(result.summary).toBe(
      'This MR is generally well-structured but has a security flaw.',
    );
    expect(result.riskLevel).toBe('MEDIUM');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toEqual({
      severity: AiReviewSeverity.HIGH,
      category: AiReviewFindingCategory.SECURITY,
      filePath: 'src/controllers/user.controller.ts',
      line: 42,
      title: 'Missing permission check',
      description: 'Endpoint should have permission decorator.',
      suggestion: 'Add @RequirePermission()',
      confidence: 0.95,
    });
    expect(result.suggestedTests).toEqual([
      'Test unauthenticated access returns 401',
    ]);
  });

  it('should throw BadRequestException on malformed JSON syntax', () => {
    const invalidJson = '{ malformed json ';
    expect(() => service.normalize(invalidJson)).toThrow(BadRequestException);
  });

  it('should fallback to defaults when optional keys or values are invalid', () => {
    const json = JSON.stringify({
      findings: [],
    });

    const result = service.normalize(json);
    expect(result.summary).toBe('');
    expect(result.riskLevel).toBe('LOW');
    expect(result.suggestedTests).toEqual([]);
  });

  it('should drop individual findings that lack required fields or have invalid enums', () => {
    const json = JSON.stringify({
      summary: 'Test',
      riskLevel: 'low',
      findings: [
        // 1. Missing description
        {
          severity: 'low',
          category: 'bug',
          title: 'Title only',
        },
        // 2. Invalid severity
        {
          severity: 'critical',
          category: 'bug',
          title: 'Title',
          description: 'Desc',
        },
        // 3. Invalid category
        {
          severity: 'low',
          category: 'bad_category',
          title: 'Title',
          description: 'Desc',
        },
        // 4. Valid finding
        {
          severity: 'low',
          category: 'bug',
          title: 'Valid title',
          description: 'Valid desc',
        },
      ],
    });

    const result = service.normalize(json);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].title).toBe('Valid title');
  });

  it('should clamp confidence and parse line numbers, while slicing long titles', () => {
    const longTitle = 'a'.repeat(300);
    const json = JSON.stringify({
      findings: [
        {
          severity: 'low',
          category: 'bug',
          title: longTitle,
          description: 'Desc',
          line: '105',
          confidence: 1.5,
        },
        {
          severity: 'low',
          category: 'bug',
          title: 'Title',
          description: 'Desc',
          line: 'not_a_number',
          confidence: -0.2,
        },
      ],
    });

    const result = service.normalize(json);
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0].title).toHaveLength(255);
    expect(result.findings[0].line).toBe(105);
    expect(result.findings[0].confidence).toBe(1.0);
    expect(result.findings[1].line).toBeNull();
    expect(result.findings[1].confidence).toBe(0.0);
  });
});
