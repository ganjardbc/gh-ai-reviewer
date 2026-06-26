import { Injectable, HttpException } from '@nestjs/common';

export interface GitlabMrDetail {
  title: string;
  source_branch: string;
  target_branch: string;
  sha: string;
  diff_refs: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  };
  web_url: string;
  iid: number;
  id: number;
}

export interface GitlabMrChange {
  old_path: string;
  new_path: string;
  diff: string;
  new_file: boolean;
  deleted_file: boolean;
  renamed_file: boolean;
}

@Injectable()
export class GitlabApiService {
  async getMergeRequest(
    baseUrl: string,
    token: string,
    projectId: string,
    mrIid: number,
  ): Promise<GitlabMrDetail> {
    const url = `${this.cleanBaseUrl(baseUrl)}/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}`;
    const res = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': token,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new HttpException(
        `Failed to fetch MR from GitLab: ${res.statusText}`,
        res.status,
      );
    }
    return res.json() as Promise<GitlabMrDetail>;
  }

  async getMergeRequestChanges(
    baseUrl: string,
    token: string,
    projectId: string,
    mrIid: number,
  ): Promise<any> {
    const url = `${this.cleanBaseUrl(baseUrl)}/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/changes`;
    const res = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': token,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new HttpException(
        `Failed to fetch MR changes from GitLab: ${res.statusText}`,
        res.status,
      );
    }
    return res.json();
  }

  async postMergeRequestNote(
    baseUrl: string,
    token: string,
    projectId: string,
    mrIid: number,
    body: string,
  ): Promise<any> {
    const url = `${this.cleanBaseUrl(baseUrl)}/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/notes`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ body }),
    });

    if (!res.ok) {
      throw new HttpException(
        `Failed to post note to GitLab: ${res.statusText}`,
        res.status,
      );
    }
    return res.json();
  }

  private cleanBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
  }
}
