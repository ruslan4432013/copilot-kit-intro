"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Suggestion {
  title?: string;
  message: string;
  icon?: string;
}

export interface CustomChatSuggestionProps {
  suggestions: Suggestion[];
  onSelectSuggestion?: (suggestion: Suggestion, index: number) => void;
  loadingIndexes?: ReadonlyArray<number>;
}

export function CustomChatSuggestion({
  suggestions,
  onSelectSuggestion,
  loadingIndexes = [],
}: CustomChatSuggestionProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 justify-center items-center w-full max-w-2xl mx-auto p-4">
      <AnimatePresence mode="popLayout">
        {suggestions.map((suggestion, index) => {
          const isLoading = loadingIndexes.includes(index);
          
          return (
            <motion.button
              key={suggestion.title || suggestion.message}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
                delay: index * 0.05,
              }}
              onClick={() => onSelectSuggestion?.(suggestion, index)}
              disabled={isLoading}
              className="relative group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 text-zinc-300 hover:text-white hover:border-indigo-500/50 hover:bg-zinc-800/80 transition-all duration-300 shadow-lg shadow-black/20 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Фоновое свечение при наведении */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {suggestion.title && (
                <span className="text-sm font-semibold tracking-wide">
                  {suggestion.title}
                </span>
              )}
              
              {!suggestion.title && (
                <span className="text-sm font-medium">
                  {suggestion.message}
                </span>
              )}

              {isLoading ? (
                <svg className="animate-spin h-3 w-3 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-indigo-400"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
