"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAgent, UseAgentUpdate, useCopilotKit } from "@copilotkit/react-core/v2";


export function CustomChatInput() {


  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent({ updates: [UseAgentUpdate.OnRunStatusChanged] });
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = useCallback(async () => {
    if (!value.trim()) return;
    agent.addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    });
    setValue("");
    await copilotkit.runAgent({ agent });
  }, [agent, copilotkit, value]);

  const stopAgent = useCallback(() => {
    copilotkit.stopAgent({ agent });
  }, [agent, copilotkit]);

  // Автоматическое изменение высоты textarea под контент
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !agent.isRunning) {
        sendMessage();
      }
    }
  };

  const handleSend = () => {
    if (value.trim() && !agent.isRunning) {
      sendMessage();
    }
  };

  return (
    <div className="relative group pointer-events-auto">
      {/* Внешнее свечение при фокусе */}
      <div
        className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500"/>

      <div
        className="relative flex flex-col w-full bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl overflow-hidden shadow-2xl transition-colors group-focus-within:border-indigo-500/50">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={'Введите текст...'}
          className="w-full z-10 bg-transparent text-zinc-100 placeholder:text-zinc-500 px-4 py-4 resize-none outline-none min-h-[56px] max-h-[200px] text-sm leading-relaxed"
          rows={1}
        />

        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex gap-1 items-center">
            <button
              type="button"
              className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-white/5"
              title="Прикрепить файл"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <button
              type="button"
              className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-white/5"
              title="Голосовой ввод"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
              </svg>
            </button>

            {agent.isRunning && (
              <button
                onClick={stopAgent}
                className="flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all border border-red-500/20 text-xs font-medium"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"/>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"/>
                </span>
                Stop Agent
              </button>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSend}
            disabled={agent.isRunning}
            className={`
              relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all overflow-hidden
              ${value.trim() && !agent.isRunning
              ? "text-white shadow-lg shadow-indigo-500/20"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"}
            `}
          >
            {/* Градиентный фон кнопки */}
            {value.trim() && !agent.isRunning && (
              <div
                className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 animate-gradient-x"/>
            )}

            <span className="relative flex items-center gap-2">
              {agent.isRunning ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                       viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                            strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Думаю...</span>
                </>
              ) : (
                <>
                  <span>Отправить</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" x2="11" y1="2" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </>
              )}
            </span>
          </motion.button>
        </div>
      </div>

      <div className="flex justify-between items-center mt-2 px-2">
        <p className="text-[10px] text-zinc-500 opacity-60 font-medium uppercase tracking-wider">
          Shift + Enter для новой строки
        </p>
        <p className="text-[10px] text-zinc-500 opacity-40">
          Powered by CopilotKit
        </p>
      </div>
    </div>
  );
}
