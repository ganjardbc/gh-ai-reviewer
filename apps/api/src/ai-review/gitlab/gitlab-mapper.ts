export interface GitlabMrEvent {
  eventType: string;           // always "merge_request"
  action: string;              // open | update | reopen | ...
  gitlabProjectId: string;
  mrIid: number;
  mrId: number;
  mrTitle: string;
  mrUrl: string;
  sourceBranch: string;
  targetBranch: string;
  sha: string;
  baseSha: string;
}

export function mapGitlabWebhook(payload: any): GitlabMrEvent {
  const attrs = payload.object_attributes || {};
  const project = payload.project || {};
  
  return {
    eventType: payload.object_kind || 'merge_request',
    action: attrs.action || 'open',
    gitlabProjectId: String(project.id || attrs.target_project_id || ''),
    mrIid: Number(attrs.iid || 0),
    mrId: Number(attrs.id || 0),
    mrTitle: attrs.title || '',
    mrUrl: attrs.url || '',
    sourceBranch: attrs.source_branch || '',
    targetBranch: attrs.target_branch || '',
    sha: attrs.last_commit?.id || '',
    baseSha: attrs.diff_refs?.base_sha || attrs.diff_refs?.start_sha || '',
  };
}
