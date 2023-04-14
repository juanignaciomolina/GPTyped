import { GPTypedClient } from "."
import { Configuration, OpenAIApi, CreateChatCompletionRequest, ChatCompletionRequestMessageRoleEnum } from "openai"

export const DEFAULT_OPEN_AI_OPTIONS = {
  model: "gpt-3.5-turbo",
  max_tokens: 4000,
  temperature: 0.4,
}

export const sendPromptToOpenAi = async (
  messages: CreateChatCompletionRequest["messages"],
  openai: OpenAIApi,
  options: any = DEFAULT_OPEN_AI_OPTIONS
): Promise<string> => {
  const response = await openai.createChatCompletion({
    ...options,
    messages,
  })
  return response?.data?.choices?.[0]?.message?.content ?? ""
}

export const sendPromptToOpenAiWithTextGenerator =
  (apiKey: string, options: any = DEFAULT_OPEN_AI_OPTIONS) =>
  async (content: string): Promise<string> => {
    const configuration = new Configuration({
      apiKey,
    })
    const openai = new OpenAIApi(configuration)
    return sendPromptToOpenAi([{ content, role: ChatCompletionRequestMessageRoleEnum.User }], openai, options)
  }

/**
 *  A client for sending prompts to OpenAI.
 */
class OpenAiClient implements GPTypedClient {
  private openAiSendFunction: (text: string) => Promise<string>

  constructor(openAiConnector: (text: string) => Promise<string>) {
    this.openAiSendFunction = openAiConnector
  }

  sendPrompt(prompt: string): Promise<string> {
    return this.openAiSendFunction(prompt)
  }
}

/**
 * Builder for creating an instance of the OpenAiClient class.
 */
export class OpenAiClientBuilder {
  private apiKey: string
  private options: object
  private openAiSendFunction: (text: string) => Promise<string>

  /**
   * Constructs a new instance of the OpenAiClientBuilder class.
   * @param {string} apiKey - The API key for OpenAI.
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.options = DEFAULT_OPEN_AI_OPTIONS
    this.openAiSendFunction = sendPromptToOpenAiWithTextGenerator(this.apiKey, this.options)
  }

  /**
   * Sets additional options for the OpenAiClientBuilder.
   * @param {object} options - Additional options for the OpenAiClientBuilder.
   * @returns {OpenAiClientBuilder} - Returns the updated OpenAiClientBuilder instance.
   */
  withOptions(options: object): OpenAiClientBuilder {
    this.options = options
    return this
  }

  /**
   * Sets a custom way of sending prompts to OpenAI.
   * @param {(text: string) => Promise<string>} promptClient - A function that sends prompt to OpenAI.
   * @returns {OpenAiClientBuilder} - Returns the updated OpenAiClientBuilder instance.
   */
  withOpenAiSendFunction(promptClient: (text: string) => Promise<string>): OpenAiClientBuilder {
    this.openAiSendFunction = promptClient
    return this
  }

  /**
   * Builds and returns an instance of the OpenAiClient class.
   * @returns {OpenAiClient} - Returns a new instance of the OpenAiClient class.
   */
  build(): OpenAiClient {
    return new OpenAiClient(this.openAiSendFunction)
  }
}
