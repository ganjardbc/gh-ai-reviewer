import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatMessage } from './prompt-builder.service';

@Injectable()
export class NineRouterAdapter {
  private readonly logger = new Logger(NineRouterAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async complete(messages: ChatMessage[], modelOverride?: string): Promise<string> {
    const apiKey = this.configService.get<string>('NINE_ROUTER_API_KEY');
    if (!apiKey) {
      this.logger.error('NINE_ROUTER_API_KEY environment variable is not defined');
      throw new InternalServerErrorException('LLM configuration error: API key missing');
    }

    const baseUrl = this.configService.get<string>('NINE_ROUTER_BASE_URL', 'https://api.9router.com').replace(/\/+$/, '');
    const defaultModel = this.configService.get<string>('AI_REVIEW_LLM_MODEL', 'gpt-4o');
    const temperatureStr = this.configService.get<string>('AI_REVIEW_LLM_TEMPERATURE', '0.2');
    const maxTokensStr = this.configService.get<string>('AI_REVIEW_LLM_MAX_TOKENS', '4096');

    const model = modelOverride || defaultModel;
    const temperature = parseFloat(temperatureStr);
    const maxTokens = parseInt(maxTokensStr, 10);

    const url = `${baseUrl}/v1/chat/completions`;

    const requestBody = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    };

    this.logger.log(`Sending chat completion request to 9router at ${url} using model: ${model}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(180000), // 3 minutes timeout
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No details');
        this.logger.error(`9router API error: Status ${response.status} - ${response.statusText} - ${errorText}`);
        throw new InternalServerErrorException(`LLM API returned status ${response.status}: ${response.statusText}`);
      }

      const jsonResponse = (await response.json()) as any;
      const content = jsonResponse?.choices?.[0]?.message?.content;

      if (content === undefined || content === null) {
        this.logger.error(`Invalid 9router response payload: ${JSON.stringify(jsonResponse)}`);
        throw new InternalServerErrorException('Invalid completion response from LLM');
      }

      return content;
    } catch (error: any) {
      if (error.name === 'TimeoutError') {
        this.logger.error('9router request timed out after 3 minutes');
        throw new InternalServerErrorException('LLM request timed out');
      }
      this.logger.error(`Failed to complete request with 9router: ${error.message}`);
      throw error;
    }
  }
}
