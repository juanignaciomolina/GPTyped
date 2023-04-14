/**
 * A Prompter submits prompts to a LLM through a GPTypedClient and returns a structured and typesafe response.
 * @interface
 */
export interface Prompter {
  /**
   * Sends a structured input to the Prompter and returns a promise that resolves to the expected response object.
   * @function
   * @template ResponseObject - The type of the response object.
   * @param {object} input - The object input to be sent to the Prompter.
   * @returns {Promise<ResponseObject>} - A promise that resolves with a type safe response object.
   */
  send<ResponseObject>(input: object): Promise<ResponseObject>
}

// Pre built prompters
export { PrompterForObjectBuilder } from "./prompter-for-object"
