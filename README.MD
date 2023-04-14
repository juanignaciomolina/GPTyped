# GPTyped

Welcome to GPTyped! 🎉 A small, but powerful NPM package that lets you interact with OpenAI's GPT language model in a type-safe way. With GPTyped, you can send objects as prompts and receive structured responses from LLM AIs in a breeze, whether you're running it on the Web or on the Server. 💻

## Features

- ✨ Sends TypeScript objects as prompts and receives TypeScript objects as responses.
- 💪 Fully customizable with interceptors to alter requests or responses at any time.
- 🤖 Comes pre-loaded with an OpenAI client for easy integration with GPT.
- 🛠️ Validates returned objects schemas using [Zod](https://zod.dev/).
- 💬 Support for common prompt patterns, like memory and metaprompts.

## Installation

You can install GPTyped using NPM or Yarn:

```bash
npm install gptyped zod
```

or

```bash
yarn add gptyped zod
```

## Basic Usage

Using GPTyped is simple. Here's an example of how you can send objects as prompts and receive type safe objects responses:

```typescript
import { OpenAiClientBuilder, PrompterForObjectBuilder } from "gptyped"
import { z } from "zod"

// A Zod schema describing the type of the AI response
export const TweetSchema = z.object({
  tweet: z.string().min(1),
  tags: z.array(z.string()).min(3),
})
type Tweet = z.infer<typeof TweetSchema> // A TypeScript type

// A Client communicates with a LLM API, in this case, OpenAI's GPT.
const gpTypedOpenAiClient = new OpenAiClientBuilder(env.OPEN_AI_SECRET_KEY).build()

// A Prompter is responsible for building and sending the prompt.
// It will also validate the type of the response.
// PrompterForObject is a Prompter that has a TypeScript object as an input
// and returns a TypeScript object as a type safe response.
const prompterForObject = new PrompterForObjectBuilder(
  gpTypedOpenAiClient,
  {
    tweet: "A tweet about the request. Maximun of 140 characters.",
    tags: "3 hashtags about the tweet.",
  },
  TweetSchema
).build()

//  Use an input object to make a request to the OpenAI API. The response will be type safe.
const result = await prompterForObject.send<Tweet>({
  topic: "Why spring is the best season?",
})

// Access the Tweet type safe response
console.log(result.tweet) // "Spring is the best season of the year."
console.log(result.tags) // ["#spring", "#flowers", "#nature"]
```

#### Note: About structured responses and generative AI

LLM's reponses are not deterministic. This means that the exact same prompt can result in different responses by the AI. Having this in mind, it's impossible to guarantee if the response will be a valid data structure or not. GPTyped will validate the response against the schema you provided using [Zod](https://zod.dev/) and return the response if it's valid. If the response is not valid, GPTyped will throw an error.

It's recommended to retry the request at least a couple of times whenever you encounter a type error, as usually subsequent requests will return a valid response. Wiht GPT, you an also try [lowering the temperature](https://platform.openai.com/docs/api-reference/completions/create#completions/create-temperature) parameter of the AI to make it more predictable.

## Contributing

Contributions are welcome! Feel free to open issues or pull requests for bug fixes, feature requests, or improvements. Please take a look at some planned improvements where you can jump in.

- Automatic retry on failed requests
- Clients for other popular LLM APIs
- Support for Markdown request/responses
- Support for CSV request/responses
- Support for other popular data formats

## License

GPTyped is open-source software released under the MIT License. Feel free to use, modify, and distribute it as per the terms of the license.
