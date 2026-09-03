import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export default function Card({ className = "", hover = false, children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 ${
        hover ? "hover:bg-white/10 transition-all duration-200 cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
