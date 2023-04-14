![GPTyped Logo](https://user-images.githubusercontent.com/4109119/232146486-ba95a5a7-54c4-4325-ad38-9f0dc0b77c51.png)

![NPM Version](https://img.shields.io/npm/v/gptyped) ![NPM MIT License](https://img.shields.io/npm/l/gptyped)

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
type Tweet = z.infer<typeof TweetSchema>

const gpTypedOpenAiClient = new OpenAiClientBuilder("YOUR_OPEN_AI_SECRET_KEY").build()

const prompterForObject = new PrompterForObjectBuilder(gpTypedOpenAiClient, TweetSchema, {
  tweet: "A tweet about the topic. Maximum of 140 characters.",
  tags: "3 hashtags about the tweet.",
}).build()

//  Use an input object to make a request to the OpenAI API. The response will be type safe.
const result = await prompterForObject.send<Tweet>({
  topic: "Why is spring the best season?",
})

// Access the Tweet type safe response
console.log(result.tweet) // "Spring is the best season because of the flowers and nature."
console.log(result.tags) // ["#spring", "#flowers", "#nature"]
```

#### Note: About structured responses and generative AI

LLM's reponses are not deterministic. This means that the exact same prompt can result in different responses by the AI. Having this in mind, it's impossible to guarantee if the response will be a valid data structure or not. GPTyped will validate the response against the schema you provided using [Zod](https://zod.dev/) and return the response if it's valid. If the response is not valid, GPTyped will throw an error.

It's recommended to retry the request at least a couple of times whenever you encounter a type error, as usually subsequent requests will return a valid response. With OpenAI's GPT, you can also try [lowering the temperature](https://platform.openai.com/docs/api-reference/completions/create#completions/create-temperature) parameter of the AI to make it more predictable.

## Contributing

Contributions are welcome! Feel free to open issues or pull requests for bug fixes, feature requests, or improvements. Please take a look at some planned improvements where you can jump in:

- Automatic retry on failed requests
- Clients for other popular LLM APIs
- Support for Markdown request/responses
- Support for CSV request/responses
- Support for other popular data formats

## License

GPTyped is open-source software released under the [MIT License](https://github.com/juanignaciomolina/GPTyped/blob/master/LICENSE.MD). Feel free to use, modify, and distribute it as per the terms of the license.
