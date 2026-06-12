"use client";

import React, { useEffect, useRef } from "react";
import { useAgent, UseAgentUpdate, CopilotChatToolCallsView } from "@copilotkit/react-core/v2";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function CustomChatMessageView() {
  const { agent } = useAgent({
    updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged],
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [agent.messages.length, agent.isRunning]);

  // Если сообщений нет, ничего не рендерим (покажется WelcomeScreen)
  if (agent.messages.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-8 scroll-smooth custom-scrollbar">
      <AnimatePresence initial={false}>
        {agent.messages.map((message, index) => {
          const isUser = message.role === "user";
          const isAssistant = message.role === "assistant";
          const isReasoning = message.role === "reasoning";
          
          if (message.role === "system") return null;
          // Сообщения роли 'tool' обычно визуализируются через ToolCallsView в сообщении ассистента
          if (message.role === "tool") return null;

          return (
            <motion.div
              key={message.id || index}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.4, 
                type: "spring",
                stiffness: 260,
                damping: 20 
              }}
              className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex flex-col gap-2.5 max-w-[90%] ${isUser ? "items-end" : "items-start"}`}>
                {/* Аватар и Имя для ассистента и рассуждений */}
                {(isAssistant || isReasoning) && (
                  <div className="flex items-center gap-2.5 ml-1 mb-1">
                    <div className="relative flex h-7 w-7">
                      <div className="absolute inset-0 bg-indigo-500 blur-md opacity-40 rounded-full animate-pulse" />
                      <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-[10px] text-white font-bold border border-white/20 shadow-lg rotate-3">
                        AI
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                        {isReasoning ? "Reasoning" : "Assistant"}
                      </span>
                      <span className="text-[8px] text-zinc-500 font-medium">{isReasoning ? "Thinking..." : "Online"}</span>
                    </div>
                  </div>
                )}

                <div
                  className={`relative px-4.5 py-3 rounded-2xl shadow-2xl transition-all duration-300 ${
                    isUser
                      ? "bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white rounded-tr-none border border-white/10 hover:shadow-indigo-500/20"
                      : isReasoning 
                        ? "bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 text-zinc-400 italic rounded-tl-none border-dashed"
                        : "bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 text-zinc-100 rounded-tl-none hover:border-zinc-700"
                  }`}
                >
                  {message.content && (
                    <div className="text-sm leading-relaxed font-medium">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc ml-4 mb-3">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal ml-4 mb-3">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          a: ({ href, children }) => (
                            <a href={href} className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/30" target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                          code: ({ children, className }) => {
                            const isInline = !className?.includes("language-");
                            return isInline ? (
                              <code className="bg-white/10 px-1.5 py-0.5 rounded text-[0.85em] font-mono border border-white/5">
                                {children}
                              </code>
                            ) : (
                              <code className={className}>
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => (
                            <pre className="bg-black/40 p-3 rounded-lg border border-zinc-800 overflow-x-auto mb-3 last:mb-0 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                              {children}
                            </pre>
                          ),
                          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic opacity-90">{children}</em>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-md font-bold mb-2 mt-4 first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-3 first:mt-0">{children}</h3>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-indigo-500/50 pl-4 py-1 italic text-zinc-400 mb-3">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {typeof message.content === 'string' 
                          ? message.content 
                          : Array.isArray(message.content)
                            ? message.content.map(c => 'text' in c ? (c as any).text : '').join('')
                            : JSON.stringify(message.content)}
                      </ReactMarkdown>
                    </div>
                  )}
                  
                  {/* Рендеринг инструментов для ассистента */}
                  {isAssistant && (
                    <div className="mt-2 empty:mt-0">
                      <CopilotChatToolCallsView message={message} messages={agent.messages} />
                    </div>
                  )}

                  {/* Декоративные элементы */}
                  {isUser && (
                    <div className="absolute top-0 -right-1 w-2.5 h-2.5 bg-indigo-600 [clip-path:polygon(0_0,0_100%,100%_0)]" />
                  )}
                  {!isUser && (
                    <div className="absolute top-0 -left-1.5 w-2.5 h-2.5 bg-zinc-900 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Индикатор печати */}
      {agent.isRunning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start"
        >
          <div className="flex flex-col gap-2 items-start">
             <div className="flex items-center gap-2.5 ml-1">
                <div className="w-7 h-7 rounded-xl bg-zinc-900/80 backdrop-blur-md flex items-center justify-center border border-zinc-800 shadow-lg">
                   <div className="flex gap-1">
                      <motion.span animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} className="w-1 h-1 rounded-full bg-indigo-500" />
                      <motion.span animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1 h-1 rounded-full bg-purple-500" />
                      <motion.span animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1 h-1 rounded-full bg-pink-500" />
                   </div>
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest animate-pulse">Ассистент думает...</span>
             </div>
          </div>
        </motion.div>
      )}
      
      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
}
