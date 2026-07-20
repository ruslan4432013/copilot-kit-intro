"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { CopilotChatUI } from "@/shared/ui/copilot-chat";
import { useAgent, useAgentContext, useCopilotKit, useHumanInTheLoop } from "@copilotkit/react-core/v2";
import {
  A2UIProvider,
  A2UIRenderer,
  initializeDefaultCatalog,
  injectStyles,
  useA2UIActions,
  useA2UIError,
  viewerTheme,
} from "@copilotkit/a2ui-renderer";
import { z } from "zod";

export const dynamic = "force-dynamic";

export type Notification = {
  id: number;
  text: string;
  type: "info" | "success" | "warning" | "error";
  // Опциональное «тело» push-уведомления: многострочные детали
  // (например, данные формы из A2UI-виджета).
  body?: string;
};

export type StatCard = {
  id: string;
  label: string;
  value: string;
  emoji: string;
  color: string;
};

export type PageState = {
  bg: { color: string; label: string } | null;
  heading: string;
  subheading: string;
  notifications: Notification[];
  stats: StatCard[];
  showConfetti: boolean;
};

const defaultStats: StatCard[] = [
  {
    id: "users",
    label: "Пользователи",
    value: "1,234",
    emoji: "👥",
    color: "linear-gradient(135deg, #667eea, #764ba2)"
  },
  { id: "revenue", label: "Доход", value: "$12.4K", emoji: "💰", color: "linear-gradient(135deg, #f093fb, #f5576c)" },
  { id: "orders", label: "Заказы", value: "384", emoji: "📦", color: "linear-gradient(135deg, #4facfe, #00f2fe)" },
  { id: "rating", label: "Рейтинг", value: "4.9 ★", emoji: "⭐", color: "linear-gradient(135deg, #fa709a, #fee140)" },
];


const getInitialTodo = () => []

function TodoList() {
  const { agent } = useAgent();

  const todos = (agent.state?.todos as any[]) ?? getInitialTodo();
  const [inputValue, setInputValue] = useState("");

  // Ensure agent.state has a `todos` array before any JSON-patch operation
  // (e.g. backend emitting `add /todos/-`) is applied. Without this, the
  // patch fails with OPERATION_PATH_CANNOT_ADD because the tree is `{}`.
  useEffect(() => {
    if (!agent) return;
    const currentState = (agent.state ?? {}) as Record<string, unknown>;
    if (!Array.isArray(currentState.todos)) {
      agent.setState({
        ...currentState,
        todos: [],
      });
    }
  }, [agent]);

  const addTodo = () => {
    if (!inputValue.trim()) return;
    const newTodo = { text: inputValue, done: false, subtext: '' };
    agent.setState({
      ...(agent.state ?? {}),
      todos: [...todos, newTodo],
    });
    setInputValue("");
  };

  const toggleTodo = (index: number) => {
    const newTodos = [...todos];
    newTodos[index] = { ...newTodos[index], done: !newTodos[index].done };
    agent.setState({
      ...agent.state,
      todos: newTodos,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-2xl bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm p-6 shadow-md border border-zinc-200/50 dark:border-zinc-700/50 mt-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📝</span>
        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">Список задач (Shared State)</h3>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="Добавить задачу..."
          className="flex-1 px-3 py-2 text-base rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          onClick={addTodo}
          className="px-3 py-2 bg-violet-600 text-white rounded-lg text-base font-medium hover:bg-violet-700 transition-colors"
        >
          Добавить
        </button>
      </div>

      {todos.length === 0 ? (
        <p className="text-base text-zinc-500 dark:text-zinc-400 italic">
          Задач пока нет. Попросите агента добавить что-нибудь!
        </p>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-2 rounded-lg bg-zinc-100/50 dark:bg-zinc-700/50 border border-zinc-200/30 dark:border-zinc-600/30"
            >
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(i)}
                className="w-4 h-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
              <span
                className={`text-base ${todo.done ? "line-through text-zinc-400" : "text-zinc-700 dark:text-zinc-200"}`}>
                {todo.text}
              </span>
              <span
                className={`text-base ${todo.done ? "line-through text-zinc-400" : "text-zinc-700 dark:text-zinc-200"}`}>
                {todo.subtext}
              </span>
            </motion.li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-zinc-400 uppercase tracking-wider font-medium">
        Агент видит это состояние в реальном времени
      </p>
    </motion.div>
  );
}


type HITLCompanyEditorProps = {
  initialValue?: string;
  onChange?: (val: string) => void;
  onSave: (val: string) => void;
  onCancel: () => void;
}

function HITLCompanyEditor(props: HITLCompanyEditorProps) {
  const { initialValue, onChange, onSave, onCancel } = props;
  const [value, setValue] = useState(initialValue ?? '');

  const handleChange = (newVal: string) => {
    setValue(newVal);
    onChange?.(newVal);
  };

  return (
    <div
      className="mt-4 p-4 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-500/30 shadow-sm animate-in fade-in slide-in-from-top-2">
      <p
        className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2 flex items-center gap-1">
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
        </span>
        Ввод данных: Компания
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Введите название компании..."
        className="w-full mb-4 px-3 py-2 text-base rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-500 text-zinc-800 dark:text-zinc-100"
        autoFocus
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => onSave(value)}
          className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-bold transition-all active:scale-95"
        >
          Сохранить
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-sm font-bold transition-all hover:bg-zinc-300 dark:hover:bg-zinc-600 active:scale-95"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

function AgentContextDemo() {
  const [user, setUser] = useState({
    name: "Джейн Смит",
    role: "Менеджер проектов",
    team: "Платформа",
    company: "CopilotKit",
  });

  useAgentContext({
    description: "Информация о текущем пользователе",
    value: user,
  });

  useHumanInTheLoop({
    name: "updateUserCompany",
    description: `Запросить у пользователя изменение названия компании в его контексте. 
      ВАЖНО: окончательное значение поля company определяет ИМЕННО пользователь через форму Human-in-the-Loop, а не ты. 
      Параметр newCompany — это лишь предложение/черновик от тебя. 
      Пользователь может оставить его как есть, отредактировать на любое другое значение или отменить ввод. 
      Если в ответе на этот tool-call приходит сообщение вида 
      'Пользователь подтвердил новое название компании: \"X\". ... company=\"X\"', 
      то это означает, что пользователь САМ согласился сохранить именно X — даже если X отличается от newCompany, 
      которое ты предлагал. В этом случае считай, что смена компании на X выполнена успешно, 
     контекст пользователя обновлён (user.company = X), и сообщи пользователю об успешной смене компании именно на X. 
     Не утверждай, что система отклонила изменение или что требуются дополнительные права — изменение применяется именно из этого подтверждения. 
      Если же приходит 'Пользователь отменил ввод компании.' — значит смена не состоялась, компания осталась прежней.",
      `,
    parameters: z.object({
      newCompany: z.string().describe("Новое название компании").optional(),
    }),
    render: ({ args, respond, status }) => {
      if (status !== "executing") return <></>;
      return (
        <HITLCompanyEditor
          initialValue={args.newCompany}
          onChange={(newVal) => setUser((prev) => ({ ...prev, company: newVal }))}
          onSave={(newVal) => {
            setUser((prev) => ({ ...prev, company: newVal }));
            setTimeout(() => {
              respond?.(`Пользователь подтвердил новое название компании: "${newVal}". Контекст пользователя обновлён, теперь company="${newVal}".`);
            }, 0)
          }}
          onCancel={() => respond?.("Пользователь отменил ввод компании.")}
        />
      );
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-2xl bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm p-6 shadow-md border border-zinc-200/50 dark:border-zinc-700/50 mt-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">👤</span>
        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">Контекст (Agent Context)</h3>
      </div>

      <div className="space-y-4">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/30 dark:border-zinc-700/30">
          <div>
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Пользователь</p>
            <input
              type="text"
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              className="w-full text-base font-semibold text-zinc-800 dark:text-zinc-100 bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-violet-500 outline-none transition-colors"
            />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Роль</p>
            <input
              type="text"
              value={user.role}
              onChange={(e) => setUser({ ...user, role: e.target.value })}
              className="w-full text-base font-semibold text-zinc-800 dark:text-zinc-100 bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-violet-500 outline-none transition-colors"
            />
          </div>
          <div className="col-span-2">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Команда</p>
            <input
              type="text"
              value={user.team}
              onChange={(e) => setUser({ ...user, team: e.target.value })}
              className="w-full text-base font-semibold text-zinc-800 dark:text-zinc-100 bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-violet-500 outline-none transition-colors"
            />
          </div>
          <div className="col-span-2">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
              Компания <span
              className="text-[11px] bg-zinc-200 dark:bg-zinc-700 px-1 rounded text-zinc-400 font-normal normal-case italic">Read-only (Edit via AI)</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-zinc-500 dark:text-zinc-400 py-1">
                {user.company}
              </span>
              <span className="text-xs text-violet-500 animate-pulse ml-auto">🤖 Human-in-the-Loop protected</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setUser({
              name: "Джейн Смит",
              role: "Менеджер проектов",
              team: "Платформа",
              company: "CopilotKit"
            })}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
              user.name === "Джейн Смит"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-violet-500"
            }`}
          >
            Джейн
          </button>
          <button
            onClick={() => setUser({
              name: "Алекс Чен",
              role: "Старший разработчик",
              team: "Мобильная разработка",
              company: "TechCorp"
            })}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
              user.name === "Алекс Чен"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-violet-500"
            }`}
          >
            Алекс
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium leading-relaxed">
        Спросите: <span className="text-violet-500 dark:text-violet-400">"Кто я?"</span> или <span
        className="text-violet-500 dark:text-violet-400">"Измени мою компанию на OpenAI"</span>
      </p>
    </motion.div>
  );
}

// ─── A2UI Demo — агент генерирует декларативный UI прямо в чате ────
const A2UI_EXAMPLE_PROMPTS = [
  { emoji: "📋", label: "Форма обратной связи", prompt: "Создай через A2UI форму обратной связи с полями: имя, email и сообщение, и кнопкой «Отправить»" },
  { emoji: "🗳️", label: "Опрос", prompt: "Построй через A2UI небольшой опрос из 3 вопросов о качестве сервиса с вариантами ответов" },
  { emoji: "🧑‍💼", label: "Карточка профиля", prompt: "Сгенерируй через A2UI карточку профиля пользователя с аватаром, именем, должностью и кнопками «Написать» и «Позвонить»" },
  { emoji: "🛒", label: "Витрина товаров", prompt: "Покажи через A2UI список из 3 карточек товаров с названием, ценой и кнопкой «В корзину»" },
  { emoji: "↩️", label: "Форма возврата", prompt: "Создай через A2UI форму возврата товара" },
];

type A2UIOperation = Record<string, any>;

const getSurfaceIdFromOps = (ops: A2UIOperation[]): string => {
  for (const op of ops) {
    const id =
      op?.createSurface?.surfaceId ??
      op?.updateComponents?.surfaceId ??
      op?.updateDataModel?.surfaceId;
    if (typeof id === "string" && id) return id;
  }
  return "default";
};

// Скармливает операции (createSurface / updateComponents / updateDataModel)
// в MessageProcessor провайдера. Должен быть потомком A2UIProvider.
function A2UIOperationsFeeder({ surfaceId, operations }: {
  surfaceId: string;
  operations: A2UIOperation[];
}) {
  const { processMessages, getSurface } = useA2UIActions();
  const lastHashRef = useRef("");

  useEffect(() => {
    const hash = JSON.stringify(operations);
    if (hash === lastHashRef.current) return;
    lastHashRef.current = hash;
    // createSurface дедупим: если поверхность уже создана, повторный
    // createSurface не переигрываем — только обновления компонентов/данных.
    processMessages(
      getSurface(surfaceId)
        ? (operations.filter((op) => !op?.createSurface) as never)
        : (operations as never),
    );
  }, [processMessages, getSurface, surfaceId, operations]);

  return null;
}

function A2UISurfaceView({ surfaceId }: { surfaceId: string }) {
  const error = useA2UIError();
  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Ошибка рендера A2UI: {error}
      </div>
    );
  }
  return <A2UIRenderer surfaceId={surfaceId} className="w-full" />;
}

const formatActionContext = (context: Record<string, unknown>): string =>
  Object.entries(context)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join("\n");

// Живой контейнер: берёт последнюю A2UI-поверхность из сообщений агента
// и рендерит её прямо на странице (вне чата). Действия пользователя
// (клики по кнопкам) отправляются обратно агенту через a2uiAction.
function A2UILiveContainer({ onNotification }: {
  onNotification?: (text: string, type: Notification["type"], body?: string) => void;
}) {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();

  useEffect(() => {
    initializeDefaultCatalog();
    injectStyles();
  }, []);

  const latestSurfaceMessage = [...agent.messages].reverse().find((m: any) => {
    return (
      m.role === "activity" &&
      m.activityType === "a2ui-surface" &&
      Array.isArray(m.content?.a2ui_operations) &&
      m.content.a2ui_operations.length > 0
    );
  }) as { content: { a2ui_operations: A2UIOperation[] } } | undefined;

  const handleAction = useCallback(
    async (message: unknown) => {
      let outgoing = message as {
        userAction?: { name?: string; context?: Record<string, unknown> };
      };
      const action = outgoing?.userAction;

      // Критичные события обрабатываем детерминированно на клиенте, не
      // полагаясь на решение LLM: заявку на возврат создаёт наш API.
      if (action?.name === "submit_return") {
        try {
          const res = await fetch("/api/returns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.context ?? {}),
          });
          const created = await res.json();
          // Фронтовый push-тост с данными формы (стек в правом верхнем углу).
          onNotification?.(
            `↩️ Возврат оформлен: ${created.requestId}`,
            "success",
            formatActionContext(action.context ?? {}),
          );
          // Обогащаем context номером заявки: по контракту в промпте агент,
          // увидев requestId, не станет создавать заявку повторно, а просто
          // подтвердит её в чате.
          outgoing = {
            ...outgoing,
            userAction: {
              ...action,
              context: {
                ...(action.context ?? {}),
                requestId: created.requestId,
                status: "created",
              },
            },
          };
        } catch {
          onNotification?.("Не удалось создать заявку на возврат", "error");
          return;
        }
      } else if (action?.name && action.context && Object.keys(action.context).length > 0) {
        // Любое другое действие из виджета (submit_feedback, add_to_cart...) —
        // push-тост с его данными.
        onNotification?.(`🪄 A2UI: ${action.name}`, "info", formatActionContext(action.context));
      }

      try {
        copilotkit.setProperties({ ...copilotkit.properties, a2uiAction: outgoing as never });
        await copilotkit.runAgent({ agent });
      } finally {
        // Обязательная зачистка: без неё a2uiAction «прилипает» к properties
        // и уезжает во все последующие запуски агента.
        if (copilotkit.properties) {
          const { a2uiAction, ...rest } = copilotkit.properties as Record<string, unknown>;
          copilotkit.setProperties(rest as never);
        }
      }
    },
    [agent, copilotkit, onNotification],
  );

  if (!latestSurfaceMessage) {
    return (
      <div className="p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-center">
        <p className="text-sm text-zinc-500">
          🪄 Здесь появится интерфейс, сгенерированный агентом.<br/>
          Попросите его в чате создать форму, опрос или карточки через A2UI.
        </p>
      </div>
    );
  }

  const operations = latestSurfaceMessage.content.a2ui_operations;
  const surfaceId = getSurfaceIdFromOps(operations);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl overflow-hidden bg-white text-zinc-900 border border-zinc-200 dark:border-zinc-600 shadow-inner p-4"
    >
      {/* key={surfaceId}: новая поверхность → чистый провайдер без старого состояния */}
      <A2UIProvider key={surfaceId} onAction={handleAction as never} theme={viewerTheme}>
        <A2UIOperationsFeeder surfaceId={surfaceId} operations={operations} />
        <A2UISurfaceView surfaceId={surfaceId} />
      </A2UIProvider>
    </motion.div>
  );
}

function A2UIDemo({ onOpenChat, onNotification }: {
  onOpenChat: () => void;
  onNotification?: (text: string, type: Notification["type"], body?: string) => void;
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handlePromptClick = async (prompt: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // clipboard может быть недоступен (http / permissions) — просто открываем чат
    }
    onOpenChat();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm p-6 shadow-md border border-zinc-200/50 dark:border-zinc-700/50 mt-6"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🪄</span>
        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">A2UI — Agent-to-UI</h3>
        <span className="ml-auto text-[11px] bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          New
        </span>
      </div>

      <p className="text-base text-zinc-600 dark:text-zinc-400 mb-4">
        Агент не ограничен заранее написанными компонентами: через протокол A2UI он{" "}
        <strong className="text-zinc-800 dark:text-zinc-200">генерирует декларативный интерфейс на лету</strong> —
        формы, карточки, списки, опросы — и стримит его прямо в чат. Кнопки и поля в таком UI интерактивны:
        действия пользователя возвращаются агенту, и он может обновить уже отрисованный интерфейс.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {A2UI_EXAMPLE_PROMPTS.map((item, i) => (
          <button
            key={item.label}
            onClick={() => handlePromptClick(item.prompt, i)}
            className="group flex items-center gap-3 p-3 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/50 border border-zinc-200/40 dark:border-zinc-700/40 text-left transition-all hover:border-violet-500/50 hover:bg-violet-50 dark:hover:bg-violet-950/20 active:scale-[0.98]"
          >
            <span className="text-2xl shrink-0">{item.emoji}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {item.label}
              </span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {item.prompt}
              </span>
            </span>
            <span className="shrink-0 text-xs font-medium text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity">
              {copiedIdx === i ? "✓ Скопировано" : "Копировать →"}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-2">
          Живая поверхность (рендер вне чата)
        </p>
        <A2UILiveContainer onNotification={onNotification}/>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500">
        <span className="uppercase tracking-wider font-medium">
          createSurface → updateComponents → updateDataModel
        </span>
        <span className="hidden sm:inline">·</span>
        <span>
          Клик по примеру копирует промпт и открывает чат — сгенерированный UI появится и в чате, и в контейнере выше
        </span>
      </div>
    </motion.div>
  );
}

function HumanInTheLoopDemo() {
  useHumanInTheLoop({
    name: "humanApprovedCommand",
    description: "Запросить разрешение у человека на выполнение команды.",
    parameters: z.object({
      command: z.string().describe("Команда для выполнения"),
    }),
    render: ({ args, respond, status }) => {
      if (status !== "executing") return <></>;
      return (
        <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-violet-500/30 shadow-inner">
          <p className="text-sm font-bold text-violet-500 uppercase tracking-wider mb-2">Требуется одобрение</p>
          <pre
            className="text-base bg-black/5 dark:bg-black/20 p-2 rounded border border-zinc-200 dark:border-zinc-700 mb-4 overflow-x-auto">
            {args.command}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={() => respond?.(`Команда "${args.command}" была одобрена и выполнена.`)}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors"
            >
              Одобрить
            </button>
            <button
              onClick={() => respond?.(`Команда "${args.command}" была отклонена пользователем.`)}
              className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold transition-colors"
            >
              Отклонить
            </button>
          </div>
        </div>
      );
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm p-6 shadow-md border border-zinc-200/50 dark:border-zinc-700/50 mt-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🤝</span>
        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">Human-in-the-Loop</h3>
      </div>
      <p className="text-base text-zinc-600 dark:text-zinc-400 mb-4">
        Агент может запрашивать ваше подтверждение перед выполнением важных действий.
      </p>
      <div className="p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-center">
        <p className="text-sm text-zinc-500">
          Здесь появится запрос, если вы скажете агенту:<br/>
          <span className="text-violet-500 font-medium italic">"Выполни команду 'deploy project'"</span>
        </p>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Определяем десктоп, чтобы менять расположение и анимацию чата:
  // справа сбоку на больших экранах и выезжающим снизу на мобильных.
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const [state, setState] = useState<PageState>({
    bg: null,
    heading: "✨ CopilotKit Demo",
    subheading: "AI-ассистент, который управляет интерфейсом",
    notifications: [],
    stats: defaultStats,
    showConfetti: false,
  });

  // Высота мобильной панели чата в пикселях (null = дефолт 75vh).
  // Пользователь может менять её, перетаскивая «ручку» пальцем.
  //
  // ВАЖНО: высоту меняем императивно через ref прямо на DOM-узле панели,
  // НЕ через React-состояние. Иначе каждый pointermove перерисовывал бы
  // весь компонент, пересоздавая callbacks и перерегистрируя инструменты/
  // подсказки чата, из-за чего содержимое CopilotChat пропадало.
  const panelRef = useRef<HTMLDivElement | null>(null);
  const mobileChatHeightRef = useRef<number | null>(null);
  const dragStateRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const getMobileBounds = () => {
    const vh = window.innerHeight;
    return { min: vh * 0.3, max: vh * 0.95, vh };
  };

  const handleHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDesktop) return;
    e.preventDefault();
    const { vh } = getMobileBounds();
    const startHeight = mobileChatHeightRef.current ?? vh * 0.75;
    dragStateRef.current = { startY: e.clientY, startHeight };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    e.preventDefault();
    const { min, max } = getMobileBounds();
    // Движение вверх (меньший clientY) увеличивает высоту панели.
    const delta = dragStateRef.current.startY - e.clientY;
    const next = Math.min(max, Math.max(min, dragStateRef.current.startHeight + delta));
    mobileChatHeightRef.current = next;
    // Применяем новую высоту напрямую к DOM — без перерисовки React-дерева.
    if (panelRef.current) {
      panelRef.current.style.height = `${next}px`;
    }
  };

  const handleHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const [bgLayers, setBgLayers] = useState<{ id: number; color: string }[]>([]);
  const bgIdRef = useRef(0);

  const callbacks = {
    onBackgroundChange: (color: string, label: string) => {
      const newId = ++bgIdRef.current;
      // Добавляем новый слой поверх старых; старые будут exit-анимированы через AnimatePresence
      setBgLayers((layers) => [...layers, { id: newId, color }]);
      setState((s) => ({ ...s, bg: { color, label } }));
      // Через 2с убираем все слои кроме последнего (анимация уже завершена)
      setTimeout(() => {
        setBgLayers((layers) => (layers.length > 1 ? [layers[layers.length - 1]] : layers));
      }, 2000);
    },
    onHeadingChange: (heading: string, subheading?: string) =>
      setState((s) => ({ ...s, heading, subheading: subheading ?? s.subheading })),
    onNotification: (text: string, type: Notification["type"], body?: string) =>
      setState((s) => ({
        ...s,
        notifications: [...s.notifications, { id: Date.now(), text, type, body }],
      })),
    onStatsUpdate: (stats: StatCard[]) =>
      setState((s) => ({ ...s, stats })),
    onConfetti: () => {
      setState((s) => ({ ...s, showConfetti: true }));
      setTimeout(() => setState((s) => ({ ...s, showConfetti: false })), 3000);
    },
  };

  const removeNotification = (id: number) =>
    setState((s) => ({
      ...s,
      notifications: s.notifications.filter((n) => n.id !== id),
    }));

  const notifStyles: Record<Notification["type"], string> = {
    info: "from-blue-500/90 to-blue-600/90 border-blue-400/50",
    success: "from-emerald-500/90 to-emerald-600/90 border-emerald-400/50",
    warning: "from-amber-500/90 to-amber-600/90 border-amber-400/50",
    error: "from-red-500/90 to-red-600/90 border-red-400/50",
  };

  const notifIcons: Record<Notification["type"], string> = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
  };

  const confettiEmojis = ["🎉", "🎊", "✨", "🥳", "🎈", "💫", "⭐"];

  return (
    <div className="relative flex flex-col h-screen overflow-y-auto font-sans">
      {/* ── Background crossfade layers ──────────────────────────── */}
      <AnimatePresence>
        {bgLayers.map((layer) => (
          <motion.div
            key={`bg-layer-${layer.id}`}
            className="fixed inset-0 z-0"
            style={{ background: layer.color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
          />
        ))}
      </AnimatePresence>
      {/* ── Confetti overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {state.showConfetti && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {Array.from({ length: 60 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-2xl"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-5%`,
                }}
                initial={{ y: 0, opacity: 1, rotate: 0 }}
                animate={{
                  y: `${100 + Math.random() * 40}vh`,
                  opacity: [1, 1, 0],
                  rotate: Math.random() * 720 - 360,
                }}
                transition={{
                  duration: 2 + Math.random() * 1.5,
                  delay: Math.random() * 1.5,
                  ease: "easeIn",
                }}
              >
                {confettiEmojis[i % confettiEmojis.length]}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Notifications stack ──────────────────────────────────── */}
      {/* z-[70] — выше панели чата (z-50) и кнопки чата (z-[60]), чтобы
          push-тосты с данными из A2UI-виджета были видны при открытом чате */}
      <div className="fixed top-20 right-4 left-4 sm:left-auto z-[70] flex flex-col gap-2 sm:w-80">
        <AnimatePresence mode="popLayout">
          {state.bg && (
            <motion.div
              key="bg-indicator"
              layout
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="flex items-center gap-2 rounded-xl bg-black/60 px-4 py-2.5 text-sm text-white backdrop-blur-md shadow-lg border border-white/10"
            >
              <motion.span
                className="inline-block h-3.5 w-3.5 rounded-full border border-white/40 shrink-0"
                style={{ background: state.bg.color }}
                layoutId="bg-color-dot"
              />
              <span className="truncate">{state.bg.label}</span>
              <button
                onClick={() => setState((s) => ({ ...s, bg: null }))}
                className="ml-auto text-white/50 hover:text-white transition-colors"
                title="Сбросить тему"
              >
                ✕
              </button>
            </motion.div>
          )}

          {state.notifications.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`flex items-start gap-2 rounded-xl bg-gradient-to-r ${notifStyles[n.type]} px-4 py-3 text-sm text-white shadow-lg border backdrop-blur-md`}
            >
              <span className="shrink-0 text-base">{notifIcons[n.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{n.text}</p>
                {n.body && (
                  <p className="mt-1 text-xs text-white/80 whitespace-pre-line break-words">
                    {n.body}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeNotification(n.id)}
                className="shrink-0 text-white/50 hover:text-white transition-colors"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-full text-sm font-bold shadow-lg shadow-violet-500/30 transition-all hover:scale-105 active:scale-95"
      >
        <span>{isChatOpen ? "✕ Закрыть" : "💬 AI Чат"}</span>
      </button>

      {/* ── Left panel: Dashboard UI ─────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col p-4 sm:p-8 lg:p-12">
        {/* Header */}
        <header className="mb-10 flex justify-between items-start">
          <div>
            <AnimatePresence mode="wait">
              <motion.h1
                key={state.heading}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-violet-600 via-pink-500 to-orange-400 bg-clip-text text-transparent leading-tight"
              >
                {state.heading}
              </motion.h1>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.p
                key={state.subheading}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                className="mt-2 text-lg text-zinc-500 dark:text-zinc-400"
              >
                {state.subheading}
              </motion.p>
            </AnimatePresence>
          </div>
        </header>

        {/* Stats grid */}
        <LayoutGroup>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {state.stats.map((stat, i) => (
              <motion.div
                key={stat.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0, background: stat.color }}
                transition={{
                  layout: { type: "spring", stiffness: 300, damping: 30 },
                  background: { duration: 0.8, ease: "easeInOut" },
                  opacity: { duration: 0.4, delay: i * 0.05 },
                  scale: { duration: 0.4, delay: i * 0.05 },
                  y: { duration: 0.4, delay: i * 0.05 },
                }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
                style={{ background: stat.color }}
              >
                <div className="absolute -right-3 -top-3 text-6xl opacity-20">{stat.emoji}</div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={stat.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm"
                  >
                    {stat.label}
                  </motion.p>
                </AnimatePresence>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={stat.value}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="mt-1 text-3xl font-bold"
                  >
                    {stat.value}
                  </motion.p>
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </LayoutGroup>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              emoji: "🎨",
              title: "Смена темы",
              desc: 'Попросите AI сменить фон — "сделай космический фон" или "тёплый закат"'
            },
            {
              emoji: "📊",
              title: "Обновление данных",
              desc: 'AI может обновить статистику — "покажи статистику магазина"'
            },
            { emoji: "🔔", title: "Уведомления", desc: 'Попросите отправить уведомление — "отправь предупреждение"' },
            {
              emoji: "🧠",
              title: "Контекст (V2)",
              desc: 'Передавайте любые данные приложения агенту через useAgentContext'
            },
            {
              emoji: "🤝",
              title: "Human-in-the-Loop",
              desc: "Агент запрашивает подтверждение перед выполнением действия"
            },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease: "easeOut" }}
              whileHover={{ y: -4, boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}
              className="rounded-2xl bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm p-6 shadow-md border border-zinc-200/50 dark:border-zinc-700/50"
            >
              <span className="text-3xl">{card.emoji}</span>
              <h3 className="mt-3 font-bold text-zinc-800 dark:text-zinc-100">{card.title}</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{card.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-6 w-full max-w-4xl">
          <div className="w-full">
            <AgentContextDemo/>
          </div>
          <div className="w-full">
            <HumanInTheLoopDemo/>
          </div>
          <div className="w-full">
            <TodoList/>
          </div>
          <div className="w-full">
            <A2UIDemo
              onOpenChat={() => setIsChatOpen(true)}
              onNotification={callbacks.onNotification}
            />
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-10 text-xs text-zinc-400 dark:text-zinc-500"
        >
          Все элементы на этой странице управляются AI-ассистентом через CopilotKit tools →
        </motion.p>
      </div>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            key={isDesktop ? "chat-desktop" : "chat-mobile"}
            id="copilot-chat"
            initial={isDesktop ? { x: "100%" } : { y: "100%" }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: "100%" } : { y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            ref={panelRef}
            style={
              !isDesktop && mobileChatHeightRef.current != null
                ? { height: `${mobileChatHeightRef.current}px` }
                : undefined
            }
            className={
              isDesktop
                ? "fixed top-0 right-0 bottom-0 z-50 h-screen w-full max-w-md border-l border-zinc-200/30 dark:border-zinc-700/30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl flex flex-col overflow-hidden shadow-[-10px_0_40px_rgba(0,0,0,0.12)]"
                : "fixed bottom-0 left-0 right-0 z-50 w-full h-[75vh] border-t border-zinc-200/30 dark:border-zinc-700/30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl flex flex-col overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-3xl pt-2"
            }
          >
            {isDesktop ? (
              <div className="h-16 shrink-0" />
            ) : (
              <div
                onPointerDown={handleHandlePointerDown}
                onPointerMove={handleHandlePointerMove}
                onPointerUp={handleHandlePointerUp}
                onPointerCancel={handleHandlePointerUp}
                role="separator"
                aria-orientation="horizontal"
                aria-label="Перетащите, чтобы изменить высоту чата"
                className="shrink-0 flex items-center justify-center w-full pt-3 pb-4 cursor-row-resize touch-none select-none"
              >
                <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <CopilotChatUI callbacks={callbacks}/>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
