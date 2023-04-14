// Description: This file exports all the clients that are available

/**
 * Represents a client for interacting with a LLM-based remote service.
 */
export interface GPTypedClient {
  /**
   * Sends a prompt to the GPT service using a connector to a LLM remote service.
   *
   * @param {string} prompt - The prompt to send to the LLM service.
   * @returns {Promise<string>} - A Promise that resolves to the generated text response from the LLM model.
   */
  sendPrompt(prompt: string): Promise<string>
}

// Pre built clients
export { OpenAiClientBuilder } from "./openai-client"
