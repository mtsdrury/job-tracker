"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

let confettiActive = false;

export function triggerConfetti() {
  if (confettiActive) return;
  confettiActive = true;

  const duration = 2000;
  const animationEnd = Date.now() + duration;

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      confettiActive = false;
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      particleCount,
      angle: randomInRange(55, 125),
      spread: randomInRange(50, 70),
      origin: { x: 0.5, y: 0.5 },
      colors: [
        "#4f46e5", // accent - indigo
        "#06b6d4", // cyan
        "#10b981", // emerald
        "#f59e0b", // amber
        "#ef4444", // red
      ],
    });
  }, 250);
}

export function triggerCelebration(milestone: string) {
  triggerConfetti();
}

export function Confetti() {
  return null;
}
