import { useState } from "react";

// 🔥 TEMP (later from Supabase)
export default function useUserTiles() {
  cconst [tiles, setTiles] = useState([
  { id: "home", order: 1, installed: true },
  { id: "calendar", order: 2, installed: true },
  { id: "chores", order: 3, installed: true },
  { id: "notes", order: 4, installed: true },
  { id: "extra1", order: 5, installed: true },
  { id: "extra2", order: 6, installed: true },
]);

  return {
    tiles,
    setTiles,
  };
}
