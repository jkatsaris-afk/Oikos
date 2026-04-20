import { useState } from "react";

export default function useUserTiles() {

  const [tiles, setTiles] = useState([
    { id: "home", order: 1, installed: true },
    { id: "announcements", order: 2, installed: true }, // ✅ ONLY VALID TILE
  ]);

  return {
    tiles,
    setTiles,
  };
}
