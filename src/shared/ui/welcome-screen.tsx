"use client";

import React from "react";
import { motion } from "framer-motion";

type WelcomeScreenProps = {
  input?: React.ReactElement;
  suggestionView?: React.ReactElement;
} & React.HTMLAttributes<HTMLDivElement>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function WelcomeScreen({ input, suggestionView, className, ...rest }: WelcomeScreenProps) {
  return (
    <div
      {...rest}
      className={`relative flex flex-col items-center justify-center min-h-[500px] h-full px-6 py-10 overflow-hidden ${className ?? ""}`}
    >
      {/* Декоративный фон: анимированные орбы */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          aria-hidden
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-500/20 blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -20, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-pink-500/10 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Сетка */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center"
      >
        {/* Бейдж */}
        <motion.div variants={itemVariants} className="mb-6">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/>
            </span>
            <span className="text-xs font-medium text-zinc-300 tracking-wide">
              Powered by CopilotKit
            </span>
          </div>
        </motion.div>

        {/* Иконка с градиентом и свечением */}
        <motion.div variants={itemVariants} className="mb-7 relative">
          <div
            className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 blur-2xl opacity-50 animate-pulse rounded-full"/>
          <motion.div
            whileHover={{ rotate: [0, -8, 8, -4, 0], scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white text-5xl shadow-2xl border border-white/20"
          >
            ✨
          </motion.div>
        </motion.div>

        {/* Заголовок */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl sm:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent tracking-tight leading-[1.1]"
        >
          Чем я могу помочь?
        </motion.h1>

        {/* Описание */}
        <motion.p
          variants={itemVariants}
          className="text-zinc-400 block px-3 mb-10 text-base sm:text-lg leading-relaxed font-medium max-w-lg"
        >
          Ваш персональный ИИ-ассистент готов к работе. Управляйте интерфейсом,
          получайте данные и решайте задачи — просто опишите, что нужно.
        </motion.p>

        {/* Поле ввода */}
        <motion.div
          variants={itemVariants}
          className="w-full relative z-10 mb-8"
        >
          {input}
        </motion.div>

        {/* Suggestions из CopilotKit */}
        <motion.div
          variants={itemVariants}
          className="w-full px-3 flex flex-col items-center"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-zinc-700"/>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
              Попробуйте спросить
            </p>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-zinc-700"/>
          </div>
          <div className="w-full flex justify-center [&_button]:transition-all [&_button]:duration-200">
            {suggestionView}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
