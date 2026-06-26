import { Test, TestingModule } from '@nestjs/testing';
import { GitlabApiService, GitlabMrDetail } from './gitlab-api.service';
import { HttpException } from '@nestjs/common';

describe('GitlabApiService', () => {
  let service: GitlabApiService;
  let mockFetch: jest.Mock;

  beforeEach(async () => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [GitlabApiService],
    }).compile();

    service = module.get<GitlabApiService>(GitlabApiService);
  });

  describe('getMergeRequest', () => {
    it('should fetch merge request details and return data', async () => {
      const mockMr: GitlabMrDetail = {
        title: 'Merge title',
        source_branch: 'feature',
        target_branch: 'main',
        sha: 'sha-head',
        diff_refs: {
          base_sha: 'sha-base',
          head_sha: 'sha-head',
          start_sha: 'sha-start',
        },
        web_url: 'http://gitlab.com/mr/1',
        iid: 1,
        id: 101,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockMr),
      });

      const result = await service.getMergeRequest(
        'https://gitlab.com/',
        'token-123',
        'group/project',
        1,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gitlab.com/api/v4/projects/group%2Fproject/merge_requests/1',
        {
          headers: {
            'PRIVATE-TOKEN': 'token-123',
            Accept: 'application/json',
          },
        },
      );
      expect(result).toEqual(mockMr);
    });

    it('should throw HttpException when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        service.getMergeRequest('https://gitlab.com', 'token-123', '123', 1),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getMergeRequestChanges', () => {
    it('should fetch merge request changes and return data', async () => {
      const mockChanges = {
        changes: [{ old_path: 'a.ts', new_path: 'a.ts', diff: '@@ ...' }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockChanges),
      });

      const result = await service.getMergeRequestChanges(
        'https://gitlab.com',
        'token-123',
        '123',
        1,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gitlab.com/api/v4/projects/123/merge_requests/1/changes',
        {
          headers: {
            'PRIVATE-TOKEN': 'token-123',
            Accept: 'application/json',
          },
        },
      );
      expect(result).toEqual(mockChanges);
    });

    it('should throw HttpException when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        service.getMergeRequestChanges(
          'https://gitlab.com',
          'token-123',
          '123',
          1,
        ),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('postMergeRequestNote', () => {
    it('should post merge request note and return response', async () => {
      const mockResponse = { id: 202, body: 'looks good' };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.postMergeRequestNote(
        'https://gitlab.com',
        'token-123',
        '123',
        1,
        'looks good',
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gitlab.com/api/v4/projects/123/merge_requests/1/notes',
        {
          method: 'POST',
          headers: {
            'PRIVATE-TOKEN': 'token-123',
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ body: 'looks good' }),
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw HttpException when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(
        service.postMergeRequestNote(
          'https://gitlab.com',
          'token-123',
          '123',
          1,
          'looks good',
        ),
      ).rejects.toThrow(HttpException);
    });
  });
});
