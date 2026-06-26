import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AiReviewSeverity, AiReviewFindingCategory } from '@prisma/client';

export interface NormalizedReviewFinding {
  filePath: string | null;
  line: number | null;
  severity: AiReviewSeverity;
  category: AiReviewFindingCategory;
  title: string;
  description: string;
  suggestion: string | null;
  confidence: number | null;
}

export interface NormalizedReviewResult {
  summary: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  findings: NormalizedReviewFinding[];
  suggestedTests: string[];
}

@Injectable()
export class AiReviewResultNormalizerService {
  private readonly logger = new Logger(AiReviewResultNormalizerService.name);

  normalize(rawJson: string): NormalizedReviewResult {
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch (error: any) {
      this.logger.error(
        `Failed to parse LLM raw response JSON: ${error.message}`,
      );
      this.logger.debug(`Raw response was: ${rawJson}`);
      throw new BadRequestException(
        `Malformed JSON response from LLM: ${error.message}`,
      );
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new BadRequestException('LLM response is not a valid JSON object');
    }

    // Normalize riskLevel
    let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (parsed.riskLevel && typeof parsed.riskLevel === 'string') {
      const upperRisk = parsed.riskLevel.toUpperCase();
      if (['HIGH', 'MEDIUM', 'LOW'].includes(upperRisk)) {
        riskLevel = upperRisk as 'HIGH' | 'MEDIUM' | 'LOW';
      }
    }

    // Normalize summary
    const summary = typeof parsed.summary === 'string' ? parsed.summary : '';

    // Normalize findings
    const findings: NormalizedReviewFinding[] = [];
    if (parsed.findings && Array.isArray(parsed.findings)) {
      for (const finding of parsed.findings) {
        if (!finding || typeof finding !== 'object') {
          this.logger.warn('Skipping invalid finding: not an object');
          continue;
        }

        const { title, description, severity, category } = finding;

        // Check required fields
        if (
          typeof title !== 'string' ||
          !title ||
          typeof description !== 'string' ||
          !description ||
          typeof severity !== 'string' ||
          !severity ||
          typeof category !== 'string' ||
          !category
        ) {
          this.logger.warn(
            `Skipping finding due to missing/invalid required fields: ${JSON.stringify(finding)}`,
          );
          continue;
        }

        // Map severity
        const upperSeverity = severity.toUpperCase();
        let normalizedSeverity: AiReviewSeverity;
        if (
          Object.values(AiReviewSeverity).includes(
            upperSeverity as AiReviewSeverity,
          )
        ) {
          normalizedSeverity = upperSeverity as AiReviewSeverity;
        } else {
          this.logger.warn(
            `Skipping finding due to unknown severity "${severity}"`,
          );
          continue;
        }

        // Map category
        const upperCategory = category.toUpperCase();
        let normalizedCategory: AiReviewFindingCategory;
        if (
          Object.values(AiReviewFindingCategory).includes(
            upperCategory as AiReviewFindingCategory,
          )
        ) {
          normalizedCategory = upperCategory as AiReviewFindingCategory;
        } else {
          this.logger.warn(
            `Skipping finding due to unknown category "${category}"`,
          );
          continue;
        }

        // Normalize filePath
        const filePath =
          typeof finding.filePath === 'string' ? finding.filePath.trim() : null;

        // Normalize line
        let line: number | null = null;
        if (finding.line !== undefined && finding.line !== null) {
          const parsedLine = parseInt(finding.line, 10);
          if (!isNaN(parsedLine) && parsedLine > 0) {
            line = parsedLine;
          }
        }

        // Normalize suggestion
        const suggestion =
          typeof finding.suggestion === 'string'
            ? finding.suggestion.trim()
            : null;

        // Normalize confidence
        let confidence: number | null = null;
        if (finding.confidence !== undefined && finding.confidence !== null) {
          const parsedConfidence = parseFloat(finding.confidence);
          if (!isNaN(parsedConfidence)) {
            // Clamp confidence to [0, 1]
            confidence = Math.max(0, Math.min(1, parsedConfidence));
          }
        }

        findings.push({
          title: title.substring(0, 255), // DB constraint is VarChar(255)
          description,
          severity: normalizedSeverity,
          category: normalizedCategory,
          filePath,
          line,
          suggestion,
          confidence,
        });
      }
    }

    // Normalize suggestedTests
    const suggestedTests: string[] = [];
    if (parsed.suggestedTests && Array.isArray(parsed.suggestedTests)) {
      for (const test of parsed.suggestedTests) {
        if (typeof test === 'string' && test.trim() !== '') {
          suggestedTests.push(test.trim());
        }
      }
    }

    return {
      summary,
      riskLevel,
      findings,
      suggestedTests,
    };
  }
}
