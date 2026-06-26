import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NineRouterAdapter } from './nine-router.adapter';
import { ChatMessage } from './prompt-builder.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('NineRouterAdapter', () => {
  let adapter: NineRouterAdapter;
  let configService: ConfigService;
  let mockFetch: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NineRouterAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'NINE_ROUTER_API_KEY') return 'test-key';
              if (key === 'NINE_ROUTER_BASE_URL')
                return 'https://api.9router.com';
              if (key === 'AI_REVIEW_LLM_MODEL') return 'gpt-4o';
              if (key === 'AI_REVIEW_LLM_TEMPERATURE') return '0.2';
              if (key === 'AI_REVIEW_LLM_MAX_TOKENS') return '4096';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<NineRouterAdapter>(NineRouterAdapter);
    configService = module.get<ConfigService>(ConfigService);

    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockMessages: ChatMessage[] = [
    { role: 'system', content: 'You are a reviewer' },
    { role: 'user', content: 'Check this code' },
  ];

  it('should throw InternalServerErrorException if NINE_ROUTER_API_KEY is missing', async () => {
    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      if (key === 'NINE_ROUTER_API_KEY') return undefined;
      return 'something';
    });

    await expect(adapter.complete(mockMessages)).rejects.toThrow(
      new InternalServerErrorException(
        'LLM configuration error: API key missing',
      ),
    );
  });

  it('should post payload and retrieve chat completions successfully', async () => {
    const mockResponsePayload = {
      choices: [
        {
          message: {
            content: '{"summary": "Looks good"}',
          },
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponsePayload),
    });

    const result = await adapter.complete(mockMessages);

    expect(result).toBe('{"summary": "Looks good"}');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.9router.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: mockMessages,
          temperature: 0.2,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('should use modelOverride if provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({
        choices: [{ message: { content: 'override response' } }],
      }),
    });

    await adapter.complete(mockMessages, 'claude-3-5-sonnet');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"model":"claude-3-5-sonnet"'),
      }),
    );
  });

  it('should throw InternalServerErrorException if response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: jest.fn().mockResolvedValueOnce('Invalid API key'),
    });

    await expect(adapter.complete(mockMessages)).rejects.toThrow(
      new InternalServerErrorException(
        'LLM API returned status 401: Unauthorized',
      ),
    );
  });

  it('should throw InternalServerErrorException if response choice content is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ choices: [] }),
    });

    await expect(adapter.complete(mockMessages)).rejects.toThrow(
      new InternalServerErrorException('Invalid completion response from LLM'),
    );
  });

  it('should convert TimeoutError to InternalServerErrorException with custom message', async () => {
    const timeoutError = new Error('The operation was aborted.');
    timeoutError.name = 'TimeoutError';
    mockFetch.mockRejectedValueOnce(timeoutError);

    await expect(adapter.complete(mockMessages)).rejects.toThrow(
      new InternalServerErrorException('LLM request timed out'),
    );
  });

  it('should bubble up other fetch errors', async () => {
    const otherError = new Error('Connection refused');
    mockFetch.mockRejectedValueOnce(otherError);

    await expect(adapter.complete(mockMessages)).rejects.toThrow(otherError);
  });
});
