import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const randomBookEmoji = () => {
  const emojis = [
    "📕",
    "📗",
    "📘",
    "📙",
    "📓",
    "📔",
    "📒",
    "📚",
    "📖",
    "📄",
    "📃",
    "📑",
    "🔖",
    "🏷️",
    "📝",
    "✏️",
    "✒️",
    "🖋️",
    "🖊️",
    "🖌️",
    "📇",
    "🗂️",
    "📁",
    "📂",
    "📜",
    "📃",
    "📄",
    "📦",
    "📰",
    "🗞️",
    "📡",
    "📚",
    "🏛️",
    "🏫",
    "🧠",
    "💡",
    "🎓",
    "📅",
    "🗒️",
    "🗓️",
  ];
  return emojis[Math.floor(Math.random() * emojis.length)];
};

export const randomPastel = () => {
  const colors = ["#F1F5F9", "#FEF3C7", "#E0F2FE", "#FDE68A", "#F3E8FF"];
  return colors[Math.floor(Math.random() * colors.length)];
};
