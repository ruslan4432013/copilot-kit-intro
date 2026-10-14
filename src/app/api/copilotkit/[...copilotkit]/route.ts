import {
  BuiltInAgent,
  CopilotRuntime,
  createCopilotHonoHandler,
  defineTool,
  InMemoryAgentRunner,
  ToolDefinition
} from '@copilotkit/runtime/v2';
import { handle } from 'hono/vercel';
import { z } from "zod";
import { MiddlewareFunction } from "@ag-ui/client";
import { EventType } from "@ag-ui/core";
import { Observable } from "rxjs";


import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// proxyapi.ru проксирует OpenRouter по пути /openrouter/v1/chat/completions,
// поэтому используем OpenAI-совместимый провайдер (он ходит на {baseURL}/chat/completions).
const proxyBase = (process.env.PROXY_API_BASE_URL || 'https://api.proxyapi.ru/openrouter').replace(/\/+$/, '');

const openrouter = createOpenAICompatible({
  name: 'proxyapi-openrouter',
  apiKey: process.env.PROXY_API_KEY,
  baseURL: proxyBase.endsWith('/v1') ? proxyBase : `${proxyBase}/v1`,
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

// Backend-тул оформления возврата: агент вызывает его сам, когда пользователь
// оформляет возврат прямо в чате (или когда событие submit_return пришло из
// поверхности в чате — там нет клиентского перехвата).
const createReturnRequest: ToolDefinition = defineTool({
  name: "createReturnRequest",
  description: "Создать заявку на возврат товара. Вызывай, когда пользователь просит оформить возврат в чате, " +
    "или когда пришло событие submit_return БЕЗ поля requestId в context.",
  parameters: z.object({
    orderId: z.string().describe("Номер заказа"),
    reason: z.string().describe("Причина возврата"),
    comment: z.string().optional().describe("Комментарий покупателя"),
  }),
  execute: async ({ orderId, reason, comment }) => {
    const requestId = `RET-${Math.floor(1000 + Math.random() * 9000)}`;
    console.log("[createReturnRequest]", { requestId, orderId, reason, comment });
    return {
      requestId,
      orderId,
      reason,
      comment: comment ?? "",
      status: "created",
      eta: "Курьер заберёт товар в течение 3 рабочих дней",
    };
  },
});

const agent = new BuiltInAgent({
  model: openrouter('z-ai/glm-5-turbo'),
  prompt: "You are a helpful assistant. " +
    "You can manage a todo list by updating the 'todos' state. " +
    "Each todo item should have a 'text' (string) and 'done' (boolean) property. " +
    "Use the state tools ONLY for todo list updates. " +
    "When the user asks you to generate UI (a form, survey, profile card, product list, etc.) " +
    "or mentions A2UI, call the render_a2ui tool following the A2UI guidelines from context. " +
    "Never use state tools for UI generation. " +
    // Контракт формы возврата: фиксируем имя события и состав context,
    // чтобы клиентский перехват в виджете срабатывал предсказуемо.
    "PRODUCT RETURN FORM CONTRACT: when asked for a product return form (форма возврата товара), " +
    "generate it via render_a2ui with: a TextField for the order number bound to /return/orderId, " +
    "a ChoicePicker for the return reason bound to /return/reason " +
    "(options: 'Не подошёл', 'Брак', 'Привезли не тот товар'), " +
    "a TextField for a comment bound to /return/comment, " +
    "and a submit Button labeled 'Оформить возврат' whose action event is named 'submit_return' " +
    "with context {orderId, reason, comment} taken from those data model paths. " +
    "HANDLING submit_return EVENTS (user pressed the form's submit button — this is NOT a request to describe " +
    "or create a form): if the event context CONTAINS requestId — the app has ALREADY created the return " +
    "request; do NOT call createReturnRequest and do NOT describe the form. Reply with a short confirmation " +
    "only, e.g.: 'Заявка на возврат <requestId> по заказу <orderId> оформлена. Причина: <reason>. " +
    "Курьер заберёт товар в течение 3 рабочих дней.' If the context has NO requestId — call " +
    "createReturnRequest with the data and then confirm with the resulting requestId in the same short format. " +
    "A log_a2ui_event tool result describing submit_return IS a real user submission that you MUST act on — " +
    "never respond to it with empty text.",
  tools: [getWeather, createReturnRequest]
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
  // Включает A2UI middleware: /info начинает анонсировать A2UI клиенту,
  // а агент получает возможность стримить декларативный UI
  // (createSurface / updateComponents / updateDataModel) прямо в чат.
  // injectA2UITool обязателен: без него модель НЕ получает инструмент
  // render_a2ui и гайдлайны — middleware лишь пассивно парсит поток.
  a2ui: {
    injectA2UITool: true,
  },
});

const app = createCopilotHonoHandler({
  runtime,
  basePath: '/api/copilotkit',
});


export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
