import { useState } from "react";

// 🔥 TEMP (later from Supabase)
export default function useUserTiles() {
  const [tiles, setTiles] = useState([
    { id: "home", order: 1, installed: true },
    { id: "calendar", order: 2, installed: true },
    { id: "chores", order: 3, installed: true },
    { id: "notes", order: 4, installed: false },
  ]);

  return {
    tiles,
    setTiles,
  };
}
