import { GPTypedClient } from "."

export const DEFAULT_OPEN_AI_OPTIONS = {
  model: "gpt-3.5-turbo",
  max_tokens: 2000,
  temperature: 0.4,
}

// Sends a prompt to OpenAI and returns the response using the "Chat Completions" endpoint.
export const sendPromptToOpenAiWithChatCompletionsEndpoint =
  (apiKey: string, options: any = DEFAULT_OPEN_AI_OPTIONS) =>
  async (prompt: string): Promise<string> => {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...options,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error("OpenAI API Error: " + response)
    }

    // parse the response from OpenAI as json
    const data = await response.json()

    // Return the response from OpenAI
    // See: https://platform.openai.com/docs/guides/chat/response-format
    return data?.choices?.[0]?.message?.content
  }

/**
 *  A client for sending prompts to OpenAI.
 */
class OpenAiClient implements GPTypedClient {
  private openAiSendFunction: (text: string) => Promise<string>

  constructor(sendFunction: (text: string) => Promise<string>) {
    this.openAiSendFunction = sendFunction
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
    this.openAiSendFunction = sendPromptToOpenAiWithChatCompletionsEndpoint(this.apiKey, this.options)
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
   * @param {(text: string) => Promise<string>} sendFunction - A function that sends a prompt to OpenAI.
   * @returns {OpenAiClientBuilder} - Returns the updated OpenAiClientBuilder instance.
   */
  withOpenAiSendFunction(sendFunction: (text: string) => Promise<string>): OpenAiClientBuilder {
    this.openAiSendFunction = sendFunction
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
