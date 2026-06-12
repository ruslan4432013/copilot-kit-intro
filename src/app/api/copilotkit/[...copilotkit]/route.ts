import {
  BuiltInAgent,
  CopilotRuntime,
  createCopilotHonoHandler,
  defineTool,
  InMemoryAgentRunner,
  ToolDefinition
} from '@copilotkit/runtime/v2';
import { handle } from 'hono/vercel';
import { type LanguageModelMiddleware, wrapLanguageModel } from 'ai';
import { LanguageModelV3Usage } from "@ai-sdk/provider";
import { z } from "zod";
import { MiddlewareFunction } from "@ag-ui/client";
import { EventType } from "@ag-ui/core";
import { Observable } from "rxjs";


import { createOpenAI } from '@ai-sdk/openai';

const openrouter = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
});

const tokenUsageMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',
  wrapGenerate: async ({ doGenerate }) => {
    const result = await doGenerate();
    console.log(result.usage)
    console.log('[Token Usage]', result.usage);
    return result;
  },
  wrapStream: async ({ doStream }) => {
    const { stream, ...rest } = await doStream();
    let usage: LanguageModelV3Usage = {
      inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 0, text: 0, reasoning: 0 },
    };
    const transformStream = stream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          if (chunk.type === 'finish') {
            usage = chunk.usage;
          }
          controller.enqueue(chunk);
        },
        flush() {
          console.log(usage)
        },
      }),
    );
    return { stream: transformStream, ...rest };
  },
};

const model = wrapLanguageModel({
  model: openrouter.chat('anthropic/claude-sonnet-4.6'),
  middleware: tokenUsageMiddleware,
});


const schema = z.object({
  city: z.string().describe("The location to get weather for"),
})

const getWeather: ToolDefinition = defineTool({
  name: "getWeatherBackend",
  description: "Get the weather for a given location.",
  parameters: schema,
  execute: async ({ city }) => {
    console.log({ city })
    return {
      city,
      country: "Россия",
      temperature: 22,
      condition: "солнечно",
      humidity: 55,
      wind: 3.2,
      source: "CopilotKit Backend (mock)",
    };
  },
});


const agent = new BuiltInAgent({
  model,
  prompt: "You are a helpful assistant. You can manage a todo list by updating the 'todos' state. Each todo item should have a 'text' (string) and 'done' (boolean) property. Use the state tools to send updates to the frontend.",
  tools: [getWeather]
})

// Инициализируем корневую структуру state на стороне агента,
// чтобы JSON-patch вида `add /todos/0` или `add /todos/-`,
// который LLM эмитит через AGUISendStateDelta, имел валидный
// целевой узел `/todos`. Без этого fast-json-patch падает с
// OPERATION_PATH_CANNOT_ADD (tree: {}).
agent.state = { todos: [] };


const logMiddleware: MiddlewareFunction = (input, next) => {
  console.log(JSON.stringify(input))
  return next.run(input)
}

// Эмитим начальный STATE_SNAPSHOT с валидной корневой структурой
// перед основным потоком событий run. Это нужно потому, что
// `compactEvents` в @ag-ui/client стартует свёртку state с `{}` и
// применяет JSON-patch с `validateOperation=true` без try/catch.
// Если первый событием идёт STATE_DELTA с `add /todos/0`, получаем
// unhandledRejection: OPERATION_PATH_CANNOT_ADD (tree: {}).
const seedStateSnapshotMiddleware: MiddlewareFunction = (input, next) => {
  const incomingState = (input.state ?? {}) as Record<string, unknown>;
  const seededState: Record<string, unknown> = {
    todos: [],
    ...incomingState,
  };
  if (!Array.isArray(seededState.todos)) {
    seededState.todos = [];
  }

  const source$ = next.run(input);
  return new Observable((subscriber) => {
    let injected = false;
    return source$.subscribe({
      next: (event) => {
        subscriber.next(event);
        // Inject STATE_SNAPSHOT right after the first RUN_STARTED event,
        // so the stream still starts with RUN_STARTED (required by ag-ui
        // client), but compactEvents has a valid root for subsequent
        // STATE_DELTA patches like `add /todos/0`.
        if (!injected && (event as any)?.type === EventType.RUN_STARTED) {
          injected = true;
          subscriber.next({
            type: EventType.STATE_SNAPSHOT,
            snapshot: seededState,
          } as any);
        }
      },
      error: (err) => subscriber.error(err),
      complete: () => subscriber.complete(),
    });
  });
}

agent.use(logMiddleware)
agent.use(seedStateSnapshotMiddleware)


const runtime = new CopilotRuntime({
  runner: new InMemoryAgentRunner(),
  agents: {
    default: agent,
  },
});

const app = createCopilotHonoHandler({
  runtime,
  basePath: '/api/copilotkit',
});


export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
