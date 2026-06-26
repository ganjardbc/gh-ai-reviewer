import { PaginationMeta } from './common/pagination';

export type AiReviewProvider = 'GITLAB';
export type AiReviewReviewMode = 'DIFF_ONLY' | 'FULL_FILE';

export interface SanitizedAiReviewProject {
  id: string;
  merchant_id: string | null;
  name: string;
  provider: AiReviewProvider;
  gitlab_base_url: string;
  gitlab_project_id: string;
  gitlab_project_path: string;
  default_branch: string | null;
  is_active: boolean;
  auto_review_enabled: boolean;
  review_mode: AiReviewReviewMode;
  max_changed_files: number;
  max_patch_chars: number;
  ignore_patterns: any;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ApiPaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}
