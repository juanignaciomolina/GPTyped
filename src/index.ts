// Entry point for the package
import { GPTypedClient, OpenAiClientBuilder } from "./clients"
import { Prompter, PrompterForObjectBuilder } from "./prompters"

function test(): string {
  return "Hello from the package!"
}

export { test, GPTypedClient, OpenAiClientBuilder, Prompter, PrompterForObjectBuilder }
