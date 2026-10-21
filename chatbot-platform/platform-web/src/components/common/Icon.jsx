import React from "react";
export default function Icon({ name = "bot", size = 20 }) {
  const paths = {
    bot: "M8 4h8v3H8z M5 7h14v13H5z M9 12v2 M15 12v2 M9 17h6 M12 1v3",
    menu: "M4 6h16 M4 12h16 M4 18h16",
    plus: "M12 5v14 M5 12h14",
    arrow: "M5 12h14 M14 7l5 5-5 5",
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    model:
      "M8 3v3 M16 3v3 M8 18v3 M16 18v3 M3 8h3 M18 8h3 M3 16h3 M18 16h3 M6 6h12v12H6z M10 10h4v4h-4z",
    routes: "M6 3v12h12 M6 8h12 M15 5l3 3-3 3 M15 12l3 3-3 3 M6 15v6",
    design:
      "M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 1-4c-2-1-1-3 1-3h2a3 3 0 0 0 3-3 9 9 0 0 0-9-8 M7 9h.01 M11 6h.01 M16 8h.01",
    book: "M12 5v16 M3 3c4 0 6 0 9 2 3-2 5-2 9-2v16c-4 0-6 0-9 2-3-2-5-2-9-2z",
    search: "M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    logout: "M9 3H4v18h5 M9 12h12 M17 8l4 4-4 4",
    check: "M5 12l4 4L19 6",
    send: "M3 3l18 9-18 9 4-9-4-9 M7 12h14",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.bot} />
    </svg>
  );
}
