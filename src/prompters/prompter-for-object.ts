import { Prompter } from "."
import { GPTypedClient } from "../clients"
import { ZodSchema } from "zod"

/**
 * Some LLMs (like the one for the GPT-3 API) may generate a JSON string wrapped in a code block.
 * This function parses a default code block (```) from a given text using a regular expression.
 *
 * @param {string} text - The input text to parse the code block from.
 * @returns {string | null} - The parsed code block content, or null if not found.
 */
const defaultCodeBlockParser = (text: string): string | null => {
  try {
    return /```[\s\S]*?\n([\s\S]*?)\n```/.exec(text)![1]!.trim()
  } catch (error) {
    return null
  }
}

/**
 * Options for configuring a prompt for an object with extended settings.
 *
 * @interface PromptForObjectOptionsExtended
 * @export
 */
export interface PromptForObjectOptionsExtended {
  /**
   * Specifies whether verbose mode is enabled. If set to true, a detailed log about the status of the request will be printed to the console.
   *
   * @type {boolean}
   * @defaultvalue false
   */
  verbose?: boolean

  /**
   * Specifies whether to log the prompt to the console. If set to true, the prompt will be logged to the console.
   *
   * @type {boolean}
   * @defaultvalue false
   */
  logPrompt?: boolean
}

// Type safe options
interface PromptForObjectOptions {
  verbose: boolean
  logPrompt: boolean
}

const DEFAULT_PROMPT_FOR_OBJECT_OPTIONS: PromptForObjectOptions = {
  verbose: false,
  logPrompt: false,
}

class PrompterForObject implements Prompter {
  private gpTypedClient: GPTypedClient
  private zodSchema: ZodSchema
  private schema: Record<string, unknown>
  private options: PromptForObjectOptions
  private metaprompt?: string
  private reminder?: string
  private memory?: string
  private codeBlockParser: (text: string) => string | null
  private rawRequestInterceptor: (rawRequest: string) => string
  private rawResponsetInterceptor: (rawResponse: string) => string
  private jsonInterceptor: (jsonString: string) => string
  private zodSchemaInterceptor: (unsafeObject: object) => object

  constructor(
    gpTypedClient: GPTypedClient,
    zodSchema: ZodSchema,
    schema: Record<string, unknown>,
    options: PromptForObjectOptionsExtended = {},
    metaprompt?: string,
    reminder?: string,
    memory?: string,
    codeBlockParser: (text: string) => string | null = defaultCodeBlockParser,
    rawRequestInterceptor: (rawRequest: string) => string = (rawRequest) => rawRequest,
    rawResponsetInterceptor: (rawResponse: string) => string = (rawResponse) => rawResponse,
    jsonInterceptor: (jsonString: string) => string = (jsonString) => jsonString,
    zodSchemaInterceptor: (unsafeObject: object) => object = (unsafeObject) => unsafeObject
  ) {
    this.gpTypedClient = gpTypedClient
    this.schema = schema
    this.zodSchema = zodSchema
    this.options = {
      ...DEFAULT_PROMPT_FOR_OBJECT_OPTIONS,
      ...options,
    }
    this.metaprompt = metaprompt
    this.reminder = reminder
    this.memory = memory
    this.codeBlockParser = codeBlockParser
    this.rawRequestInterceptor = rawRequestInterceptor
    this.rawResponsetInterceptor = rawResponsetInterceptor
    this.jsonInterceptor = jsonInterceptor
    this.zodSchemaInterceptor = zodSchemaInterceptor
  }

  async send<ResponseObject>(input: object): Promise<ResponseObject> {
    const prompt = `
      ${this.metaprompt ? this.metaprompt + "\n" : ""}
      ${this.memory ? "Consider this context for your response: " + this.memory + "\n" : ""}
      ${this.reminder ? this.reminder + "\n" : ""}

      output = ${JSON.stringify(this.schema, null, 4)}

      input = ${JSON.stringify(input, null, 4)}

      [JSON ONLY]
  `
    if (this.options.verbose) {
      console.log("---------------------------------")
      console.log("🤖 New request to OpenAI")
    }
    this.options.logPrompt && console.log(prompt)
    this.options.verbose && console.log("📡 Awaiting response from OpenAI...")

    // Make the actual request to OpenAI. Wrapped in an interceptor to allow for custom logic.
    const promptResult = this.rawResponsetInterceptor(
      await this.gpTypedClient.sendPrompt(this.rawRequestInterceptor(prompt))
    )

    if (this.options.verbose) {
      console.log("✅ Response received from Open AI")
      console.log("🧹 Cleaning up possible JSON invalid characters...")
    }
    // Replace quotes with double quotes (as JSON requires to be valid)
    const sanitizedResult = promptResult.replace(/[\u2018\u2019]/g, '"').replace(/[\u201C\u201D]/g, '"')

    this.options.verbose && console.log("🔍 Looking for JSON string in the response...")
    // Check if the JSON string is wrapped in a code block.
    const codeBlock = this.codeBlockParser(sanitizedResult)

    // There is no guarantee of which type (if any) the JSON will be parsed into at this point.
    let responseAsObject: object
    try {
      // Will throw an exception if the result is not a valid JSON.
      this.options.verbose && console.log("🔍 Parsing JSON...")
      if (codeBlock) {
        responseAsObject = JSON.parse(this.jsonInterceptor(codeBlock)) as object
      } else {
        responseAsObject = JSON.parse(this.jsonInterceptor(sanitizedResult)) as object
      }

      this.options.verbose && console.log("✅ JSON parsed and object created from the response.")
    } catch (error) {
      if (this.options.verbose) {
        console.log(
          "❌ Error while parsing an object from a JSON. The AI generated response it's likely and invalid JSON."
        )
        console.log("Take a look at the response and check if it is a valid JSON:")
        console.log(sanitizedResult)
      }
      throw error
    }

    this.options.verbose && console.log("🔍 Validating results with expected schema...")

    let resultAsTypeSafeObject: ResponseObject
    try {
      // Now, we validate that the resulting object contains what we expect from it using Zod.
      // Will throw an error if the result is not a valid @ObjectType
      resultAsTypeSafeObject = this.zodSchema.parse(this.zodSchemaInterceptor(responseAsObject)) as ResponseObject
    } catch (error) {
      if (this.options.verbose) {
        console.log("❌ The object returned by the AI doesn't met the expected Zod schema.")
        console.log(error)
      }
      throw error
    }

    if (this.options.verbose) {
      console.log("✅ Results are valid and type safe")
      // If we got this far, the result is a valid and type safe.
      console.log("✅ Request handled successfully. Returning results.")
    }
    return resultAsTypeSafeObject
  }
}

/**
 * Builder class for creating a PrompterForObject instance.
 */
export class PrompterForObjectBuilder {
  private gpTypedClient: GPTypedClient
  private zodSchema: ZodSchema
  private schema: Record<string, unknown>
  private options: PromptForObjectOptions
  private metaprompt?: string
  private reminder?: string
  private memory?: string
  private codeBlockParser: (text: string) => string | null
  private rawRequestInterceptor: (rawRequest: string) => string
  private rawResponsetInterceptor: (rawResponse: string) => string
  private jsonInterceptor: (jsonString: string) => string
  private zodSchemaInterceptor: (unsafeObject: object) => object

  /**
   * Creates a new instance of PrompterForObjectBuilder.
   * @param {GPTypedClient} gpTypedClient - The GPTypedClient instance.
   * @param {Record<string, unknown>} schema - The schema for the object to send with the prompt.
   * @param {ZodSchema} zodSchema - The ZodSchema for validating the object.
   */
  constructor(gpTypedClient: GPTypedClient, zodSchema: ZodSchema, schema: Record<string, unknown>) {
    this.gpTypedClient = gpTypedClient
    this.zodSchema = zodSchema
    this.schema = schema
    this.options = DEFAULT_PROMPT_FOR_OBJECT_OPTIONS
    this.metaprompt = undefined
    this.reminder = undefined
    this.memory = undefined
    this.codeBlockParser = defaultCodeBlockParser
    this.rawRequestInterceptor = (rawRequest) => rawRequest
    this.rawResponsetInterceptor = (rawResponse) => rawResponse
    this.jsonInterceptor = (jsonString) => jsonString
    this.zodSchemaInterceptor = (unsafeObject) => unsafeObject
  }

  /**
   * Sets the options for prompting the object.
   * @param {PromptForObjectOptions} options - The options when prompting the object.
   * @returns {PrompterForObjectBuilder} - The updated PrompterForObjectBuilder instance.
   */
  withOptions(options: PromptForObjectOptions): PrompterForObjectBuilder {
    this.options = options
    return this
  }

  /**
   * Sets the metaprompt of the prompt.
   * @param {string | undefined} metaprompt - The metaprompt for prompting the object.
   * @returns {PrompterForObjectBuilder} - The updated PrompterForObjectBuilder instance.
   */
  withMetaprompt(metaprompt?: string): PrompterForObjectBuilder {
    this.metaprompt = metaprompt
    return this
  }

  /**
   * Sets a reminder message to send when on the prompt.
   * @param {string | undefined} reminder - The reminder for prompting the object.
   * @returns {PrompterForObjectBuilder} - The updated PrompterForObjectBuilder instance.
   */
  withReminder(reminder?: string): PrompterForObjectBuilder {
    this.reminder = reminder
    return this
  }

  /**
   * LLM's can't remember previous prompts by default.
   * This is a workaround to make them remember previous prompts.
   * @param {string | undefined} memory - The memory part of the prompt.
   * @returns {PrompterForObjectBuilder} - The updated PrompterForObjectBuilder instance.
   */
  withMemory(memory?: string): PrompterForObjectBuilder {
    this.memory = memory
    return this
  }

  /**
   * Sets a custom code block parser for parsing code blocks in the response.
   * @param {(text: string) => string | null} codeBlockParser - The code block parser function.
   * @returns {PrompterForObjectBuilder} - The updated PrompterForObjectBuilder instance.
   */
  withCodeBlockParser(codeBlockParser: (text: string) => string | null): PrompterForObjectBuilder {
    this.codeBlockParser = codeBlockParser
    return this
  }

  /**
   * Intercepts the raw request before sending it to the AI.
   * @param {(rawRequest: string) => string} rawRequestInterceptor - The raw request interceptor function.
   * @returns {PrompterForObjectBuilder} - The updated PrompterForObjectBuilder instance.
   */
  withRawRequestInterceptor(rawRequestInterceptor: (rawRequest: string) => string): PrompterForObjectBuilder {
    this.rawRequestInterceptor = rawRequestInterceptor
    return this
  }

  /**
   * Intercepts the raw response before parsing it.
   * @param {(rawResponse: string) => string} rawResponsetInterceptor - The raw response interceptor function.
   * @returns {PrompterForObjectBuilder} - The updated PrompterForObjectBuilder instance.
   */
  withRawResponsetInterceptor(rawResponsetInterceptor: (rawResponse: string) => string): PrompterForObjectBuilder {
    this.rawResponsetInterceptor = rawResponsetInterceptor
    return this
  }

  /**
   * Intercepts the JSON string before parsing it.
   * @param {(jsonString: string) => string} jsonInterceptor - The JSON string interceptor function.
   * @returns {PrompterForObjectBuilder} - The updated PrompterForObjectBuilder instance.
   */
  withJsonInterceptor(jsonInterceptor: (jsonString: string) => string): PrompterForObjectBuilder {
    this.jsonInterceptor = jsonInterceptor
    return this
  }

  /**
   * Intercepts the object before validating it with Zod.
   * @param {(unsafeObject: object) => object} zodSchemaInterceptor - The object interceptor function.
   * @returns {PrompterForObjectBuilder} - The updated PrompterForObjectBuilder instance.
   */
  withZodSchemaInterceptor(zodSchemaInterceptor: (unsafeObject: object) => object): PrompterForObjectBuilder {
    this.zodSchemaInterceptor = zodSchemaInterceptor
    return this
  }

  /**
   * Builds the PrompterForObject instance.
   * @returns {PrompterForObject} - The PrompterForObject instance.
   */
  build(): PrompterForObject {
    return new PrompterForObject(
      this.gpTypedClient,
      this.zodSchema,
      this.schema,
      this.options,
      this.metaprompt,
      this.reminder,
      this.memory,
      this.codeBlockParser,
      this.rawRequestInterceptor,
      this.rawResponsetInterceptor,
      this.jsonInterceptor,
      this.zodSchemaInterceptor
    )
  }
}
