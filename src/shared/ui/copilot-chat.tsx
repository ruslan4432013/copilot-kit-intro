"use client";

import {
  CopilotChat,
  useAgent,
  useConfigureSuggestions,
  useCopilotKit,
  useFrontendTool,
  useRenderTool,
} from "@copilotkit/react-core/v2";
import { z } from "zod";
import type { Notification, StatCard } from "@/app/page";
import React, { useCallback, useEffect, useState } from "react";
import { WelcomeScreen } from "./welcome-screen";
import { CustomChatInput } from "./custom-chat-input";
import { CustomChatSuggestion } from "./custom-chat-suggestion";
import { CustomChatMessageView } from "./custom-chat-message-view";


// ─── Generative UI: Карточка погоды ───────────────────────────────
function WeatherCard({ city, temperature, condition, humidity, wind }: {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
  wind: number;
}) {
  const conditionEmoji: Record<string, string> = {
    "солнечно": "☀️",
    "облачно": "☁️",
    "дождь": "🌧️",
    "снег": "❄️",
    "гроза": "⛈️",
    "туман": "🌫️",
  };
  const emoji = conditionEmoji[condition?.toLowerCase()] ?? "🌤️";

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-lg max-w-xs my-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-80">Погода</p>
          <h3 className="text-xl font-bold">{city}</h3>
        </div>
        <span className="text-4xl">{emoji}</span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-5xl font-extrabold leading-none">{temperature}°</span>
        <span className="mb-1 text-lg capitalize">{condition}</span>
      </div>
      <div className="mt-4 flex gap-6 text-sm opacity-90">
        <span>💧 Влажность: {humidity}%</span>
        <span>💨 Ветер: {wind} м/с</span>
      </div>
    </div>
  );
}

// ─── Generative UI: Карточка рецепта ──────────────────────────────
function RecipeCard({ title, cookTime, servings, difficulty, ingredients, steps, emoji }: {
  title: string;
  cookTime: string;
  servings: number;
  difficulty: string;
  ingredients: string[];
  steps: string[];
  emoji: string;
}) {
  const difficultyColor: Record<string, string> = {
    "легко": "bg-green-500",
    "средне": "bg-yellow-500",
    "сложно": "bg-red-500",
  };
  const badgeColor = difficultyColor[difficulty?.toLowerCase()] ?? "bg-zinc-500";

  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 p-5 text-white shadow-lg max-w-sm my-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-80">Рецепт</p>
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <span className="text-4xl">{emoji}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-white/20 px-3 py-1">⏱ {cookTime}</span>
        <span className="rounded-full bg-white/20 px-3 py-1">🍽 {servings} порц.</span>
        <span className={`rounded-full px-3 py-1 ${badgeColor}`}>{difficulty}</span>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold mb-1">🧾 Ингредиенты:</p>
        <ul className="list-disc list-inside text-sm opacity-90 space-y-0.5">
          {ingredients.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold mb-1">👨‍🍳 Приготовление:</p>
        <ol className="list-decimal list-inside text-sm opacity-90 space-y-0.5">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─── Callbacks type ───────────────────────────────────────────────
export type PageCallbacks = {
  onBackgroundChange?: (color: string, label: string) => void;
  onHeadingChange?: (heading: string, subheading?: string) => void;
  onNotification?: (text: string, type: Notification["type"]) => void;
  onStatsUpdate?: (stats: StatCard[]) => void;
  onConfetti?: () => void;
};

// ─── Хук с регистрацией frontend tools ────────────────────────────
export function useDemoActions(callbacks?: PageCallbacks) {
  // ─── Tool: showWeather ──────────────────────────────────────────
  useFrontendTool({
    name: "showWeather",
    description: "Показать карточку погоды для указанного города. Используй когда пользователь спрашивает о погоде.",
    parameters: z.object({
      city: z.string().describe("Название города"),
      temperature: z.number().describe("Температура в °C"),
      condition: z.string().describe("Состояние: солнечно, облачно, дождь, снег, гроза, туман"),
      humidity: z.number().describe("Влажность в %"),
      wind: z.number().describe("Скорость ветра м/с"),
    }),
    handler: async ({ city, temperature, condition, humidity, wind }) => {
      return `Погода в ${city}: ${temperature}°C, ${condition}, влажность ${humidity}%, ветер ${wind} м/с`;
    },
  });

  useRenderTool(
    {
      name: "showWeather",
      parameters: z.object({
        city: z.string(),
        temperature: z.number(),
        condition: z.string(),
        humidity: z.number(),
        wind: z.number(),
      }),
      render: ({ status, parameters }) => {
        if (status === "inProgress") {
          return <p className="text-sm text-zinc-400 animate-pulse">⏳ Загрузка погоды...</p>;
        }
        if (status === "executing") {
          return <p className="text-sm text-yellow-400 animate-pulse">⚙️ Получаем данные для {parameters.city}...</p>;
        }
        return (
          <WeatherCard
            city={parameters.city}
            temperature={parameters.temperature}
            condition={parameters.condition}
            humidity={parameters.humidity}
            wind={parameters.wind}
          />
        );
      },
    },
    [],
  );

  // ─── Tool: showRecipe — красивая карточка рецепта ───────────────
  useFrontendTool({
    name: "showRecipe",
    description: "Показать красивую карточку рецепта. Используй когда пользователь просит рецепт блюда или спрашивает как приготовить что-то.",
    parameters: z.object({
      title: z.string().describe("Название блюда"),
      cookTime: z.string().describe("Время приготовления, например '30 мин' или '1.5 часа'"),
      servings: z.number().describe("Количество порций"),
      difficulty: z.string().describe("Сложность: легко, средне, сложно"),
      ingredients: z.array(z.string()).describe("Список ингредиентов с количеством"),
      steps: z.array(z.string()).describe("Пошаговые инструкции приготовления"),
      emoji: z.string().describe("Эмодзи блюда, например 🍝 🍕 🍰 🥗"),
    }),
    handler: async ({ title }) => {
      return `Рецепт "${title}" успешно показан`;
    },
  });

  useRenderTool(
    {
      name: "showRecipe",
      parameters: z.object({
        title: z.string(),
        cookTime: z.string(),
        servings: z.number(),
        difficulty: z.string(),
        ingredients: z.array(z.string()),
        steps: z.array(z.string()),
        emoji: z.string(),
      }),
      render: ({ status, parameters }) => {
        if (status !== "complete") {
          return (
            <div className="my-2 flex items-center gap-2 text-sm text-orange-300 animate-pulse">
              <span>🍳</span>
              <span>Готовим рецепт{parameters.title ? ` «${parameters.title}»` : ""}...</span>
            </div>
          );
        }
        return (
          <RecipeCard
            title={parameters.title}
            cookTime={parameters.cookTime}
            servings={parameters.servings}
            difficulty={parameters.difficulty}
            ingredients={parameters.ingredients}
            steps={parameters.steps}
            emoji={parameters.emoji}
          />
        );
      },
    },
    [],
  );

  // ─── Tool: changeBackground — влияет на UI вне чата ─────────────
  useFrontendTool({
    name: "changeBackground",
    description: "Изменить цвет фона страницы за пределами чата. Используй когда пользователь просит сменить тему, фон, настроение страницы или цвет.",
    parameters: z.object({
      color: z.string().describe("CSS-цвет фона, например '#1a1a2e', '#fef3c7', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'"),
      label: z.string().describe("Краткое описание темы, например 'Ночная тема', 'Тёплый закат'"),
    }),
    handler: async ({ color, label }) => {
      callbacks?.onBackgroundChange?.(color, label);
      return `Фон страницы изменён на "${label}"`;
    },
  });

  useRenderTool(
    {
      name: "changeBackground",
      parameters: z.object({
        color: z.string(),
        label: z.string(),
      }),
      render: ({ status, parameters }) => {
        if (status !== "complete") {
          return <p className="text-sm text-purple-400 animate-pulse">🎨 Меняем оформление...</p>;
        }
        return (
          <div className="my-2 flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-200">
            <span
              className="inline-block h-5 w-5 rounded-full border border-white/30"
              style={{ background: parameters.color }}
            />
            <span>Тема изменена: <strong>{parameters.label}</strong></span>
          </div>
        );
      },
    },
    [],
  );

  // ─── Tool: changeHeading — меняет заголовок страницы ─────────────
  useFrontendTool({
    name: "changeHeading",
    description: "Изменить заголовок и подзаголовок на странице. Используй когда пользователь просит изменить заголовок, название или описание страницы.",
    parameters: z.object({
      heading: z.string().describe("Новый заголовок страницы"),
      subheading: z.string().optional().describe("Новый подзаголовок (необязательно)"),
    }),
    handler: async ({ heading, subheading }) => {
      callbacks?.onHeadingChange?.(heading, subheading);
      return `Заголовок изменён на "${heading}"`;
    },
    render: ({ status, args }) => {
      if (status !== "complete") {
        return <p className="text-sm text-violet-400 animate-pulse">✏️ Обновляем заголовок...</p>;
      }
      return (
        <div className="my-2 rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-200">
          ✏️ Заголовок: <strong>{args.heading}</strong>
        </div>
      );
    },
  });


  // ─── Tool: sendNotification — уведомления вне чата ──────────────
  useFrontendTool({
    name: "sendNotification",
    description: "Отправить уведомление, которое появится в правом верхнем углу страницы вне чата. Используй когда пользователь просит отправить уведомление, алерт, предупреждение или сообщение на страницу.",
    parameters: z.object({
      text: z.string().describe("Текст уведомления"),
      type: z.enum(["info", "success", "warning", "error"]).describe("Тип: info, success, warning, error"),
    }),
    handler: async ({ text, type }) => {
      callbacks?.onNotification?.(text, type);
      return `Уведомление отправлено: "${text}"`;
    },
  });

  useRenderTool(
    {
      name: "sendNotification",
      parameters: z.object({
        text: z.string(),
        type: z.enum(["info", "success", "warning", "error"]),
      }),
      render: ({ status, parameters }) => {
        if (status !== "complete") {
          return <p className="text-sm text-blue-400 animate-pulse">🔔 Отправляем уведомление...</p>;
        }
        const icons = { info: "ℹ️", success: "✅", warning: "⚠️", error: "❌" };
        return (
          <div className="my-2 rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-200">
            {icons[parameters.type]} Уведомление: {parameters.text}
          </div>
        );
      },
    },
    [],
  );

  // ─── Tool: updateStats — обновить карточки статистики ────────────
  useFrontendTool({
    name: "updateStats",
    description: "Обновить карточки статистики на дашборде. Используй когда пользователь просит показать статистику, обновить данные, показать метрики. Придумай правдоподобные данные по теме.",
    parameters: z.object({
      stats: z.array(z.object({
        id: z.string().describe("Уникальный id карточки"),
        label: z.string().describe("Название метрики"),
        value: z.string().describe("Значение, например '2,500' или '$45K'"),
        emoji: z.string().describe("Эмодзи для карточки"),
        color: z.string().describe("CSS gradient, например 'linear-gradient(135deg, #667eea, #764ba2)'"),
      })).describe("Массив из 4 карточек статистики"),
    }),
    handler: async ({ stats }) => {
      callbacks?.onStatsUpdate?.(stats);
      return `Статистика обновлена: ${stats.map((s) => s.label).join(", ")}`;
    },
  });

  useRenderTool(
    {
      name: "updateStats",
      parameters: z.object({
        stats: z.array(z.object({
          id: z.string(),
          label: z.string(),
          value: z.string(),
          emoji: z.string(),
          color: z.string(),
        })),
      }),
      render: ({ status, parameters }) => {
        if (status !== "complete") {
          return <p className="text-sm text-cyan-400 animate-pulse">📊 Обновляем статистику...</p>;
        }
        return (
          <div className="my-2 rounded-xl bg-zinc-800 px-4 py-3 text-sm text-zinc-200">
            <p className="font-semibold mb-1">📊 Статистика обновлена:</p>
            <div className="flex flex-wrap gap-2">
              {parameters.stats.map((s) => (
                <span key={s.id} className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs">
                  {s.emoji} {s.label}: {s.value}
                </span>
              ))}
            </div>
          </div>
        );
      },
    },
    [],
  );

  // ─── Tool: celebrate — конфетти на странице ─────────────────────
  useFrontendTool({
    name: "celebrate",
    description: "Запустить анимацию конфетти на всей странице. Используй когда пользователь просит отпраздновать, поздравить, запустить конфетти или салют.",
    parameters: z.object({
      reason: z.string().describe("Причина празднования"),
    }),
    handler: async ({ reason }) => {
      callbacks?.onConfetti?.();
      return `🎉 Празднуем: ${reason}`;
    },
  });

  useRenderTool(
    {
      name: "celebrate",
      parameters: z.object({
        reason: z.string(),
      }),
      render: ({ status, parameters }) => {
        if (status !== "complete") {
          return <p className="text-sm text-yellow-400 animate-pulse">🎉 Готовим конфетти...</p>;
        }
        return (
          <div
            className="my-2 rounded-xl bg-gradient-to-r from-yellow-500/30 to-pink-500/30 border border-yellow-500/40 px-4 py-2 text-sm text-white shadow-sm font-medium">
            🎉🎊 {parameters.reason}
          </div>
        );
      },
    },
    [],
  );

  // ─── Render for backend tool: getWeatherBackend ────────────────
  useRenderTool(
    {
      name: "getWeatherBackend",
      parameters: z.object({
        city: z.string(),
      }),
      render: ({ status, result }) => {
        if (status !== "complete") {
          return <p className="text-sm text-blue-400 animate-pulse">🌐 Запрашиваем реальную погоду с сервера...</p>;
        }
        console.log({ result: JSON.parse(result) })
        const data = typeof result === "string" ? JSON.parse(result) : result;
        if (data?.error) {
          return (
            <div className="my-2 rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm text-red-300">
              ❌ {data.error}
            </div>
          );
        }
        return (
          <div className="my-2">
            <WeatherCard
              city={`${data.city}, ${data.country}`}
              temperature={Math.round(data.temperature)}
              condition={data.condition}
              humidity={data.humidity}
              wind={Math.round(data.wind * 10) / 10}
            />
            <p className="text-xs text-zinc-500 mt-1 ml-1">📡 {data.source}</p>
          </div>
        );
      },
    },
    [],
  );

  // ─── AI-generated suggestions ──────────────────────────────────
  useConfigureSuggestions({
    instructions: `
    Предложи 3 интересных действия, которые пользователь может попросить AI сделать на этой странице. 
    Например: сменить тему/фон, показать рецепт, узнать погоду, обновить статистику, отправить уведомление, 
    запустить конфетти, изменить заголовок. Пиши на русском языке, коротко и интересно.`,
    minSuggestions: 3,
    maxSuggestions: 3,
  });

  // ─── Wildcard рендерер ("*") ────────────────────────────────────
  useRenderTool(
    {
      name: "*",
      render: ({ name, status }) => (
        <div className="my-1 flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300">
          <span>{status === "complete" ? "✅" : "⏳"}</span>
          <span>
            <strong>{name}</strong>: {
            status === "inProgress" ? "подготовка..." :
              status === "executing" ? "выполняется..." :
                "готово"
          }
          </span>
        </div>
      ),
    },
    [],
  );
}


// ─── Внутренний компонент с агентом (рендерится только когда нет ошибки) ───
function CopilotChatInner({ callbacks }: {
  callbacks?: PageCallbacks;
}) {
  const { agent } = useAgent({ updates: [] });
  useDemoActions(callbacks);

  const clearChat = () => {
    agent.setMessages([])
  }


  // ─── Статические подсказки для пустого чата (WelcomeScreen) ─────
  useConfigureSuggestions({
    available: "before-first-message",
    suggestions: [
      { title: "🌤️ Погода", message: "Какая погода в Москве?" },
      { title: "🍕 Рецепт", message: "Покажи рецепт пиццы" },
      { title: "🎨 Тема", message: "Смени тему оформления на ночную" },
      { title: "📊 Статистика", message: "Покажи статистику дашборда" },
      { title: "🎉 Конфетти", message: "Запусти конфетти в честь успеха" },
    ],
  });


  return (
    <div
      className="flex flex-col flex-1 min-h-0 m-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-2xl shadow-black/40 overflow-hidden [--background:oklch(0.21_0.006_285.885)] [--foreground:oklch(0.985_0_0)] [--border:oklch(0.27_0.006_286)] [--ring:oklch(0.55_0.16_265)]">
      <div
        className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/>
          </span>
          <span className="text-xs font-medium text-zinc-300 tracking-wide">
            AI Assistant
          </span>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700/60"
          title="Очистить историю чата"
        >
          🗑️ Очистить
        </button>
      </div>
      <CopilotChat
        className="flex-1 min-h-0 bg-zinc-950 text-zinc-100"
        input={CustomChatInput as never}
        suggestionView={CustomChatSuggestion as any}
        messageView={CustomChatMessageView as any}
        welcomeScreen={({ input, suggestionView }) => (
          <WelcomeScreen input={input} suggestionView={suggestionView}/>
        )}
        labels={{
          chatInputPlaceholder: 'Введите сообщение...'
        }}
      />
    </div>
  );
}


// ─── Основной компонент чата ──────────────────────────────────────
export const CopilotChatUI = ({ callbacks }: {
  callbacks?: PageCallbacks;
}) => {
  const { copilotkit } = useCopilotKit();
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);


  useEffect(() => {
    const { unsubscribe } = copilotkit.subscribe({
      onError: (event) => {
        const status = (event as any)?.status;
        const payload = (event as any)?.payload;
        const raw = (event as any)?.error;

        let message: string;
        if (event.error.message.includes('Unauthorized')) {
          message = "Ошибка авторизации (401). Проверьте ключ API или войдите заново.";
        } else if (status) {
          message = `Ошибка сервера (${status}): ${payload?.error ?? raw?.message ?? "неизвестная ошибка"}`;
        } else if (raw instanceof Error) {
          message = raw.message;
        } else {
          message = "Произошла непредвиденная ошибка. Попробуйте позже.";
        }

        setError({ message, status });
      },
    });

    return () => unsubscribe();
  }, [copilotkit]);


  return (
    <div className="relative h-full flex flex-col">
      {error ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div
              role="alert"
              className="w-full max-w-md rounded-lg bg-red-500/15 px-5 py-4 text-sm text-red-400 border border-red-500/25"
            >
              <div className="flex items-center justify-between gap-2">
                <span>⚠️ {error.message}</span>
                <button
                  onClick={dismissError}
                  className="shrink-0 rounded p-1 hover:bg-red-500/20 transition-colors"
                  aria-label="Закрыть"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ) :
        <CopilotChatInner callbacks={callbacks}/>
      }
    </div>
  );
};
