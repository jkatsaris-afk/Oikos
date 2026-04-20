import { useState } from "react";

export default function useUserTiles() {

  const [tiles, setTiles] = useState([
    { id: "home", order: 1, installed: true },
    { id: "announcements", order: 2, installed: true }, // ✅ ONLY VALID TILE
  ]);

  /* =========================
     UNINSTALL TILE
  ========================= */
  const uninstallTile = (tileId) => {
    setTiles(prev =>
      prev.map(tile =>
        tile.id === tileId
          ? { ...tile, installed: false }
          : tile
      )
    );
  };

  /* =========================
     INSTALL TILE (FOR LATER)
  ========================= */
  const installTile = (tileId) => {
    setTiles(prev => {
      const exists = prev.find(t => t.id === tileId);

      // if tile exists, just re-enable
      if (exists) {
        return prev.map(t =>
          t.id === tileId
            ? { ...t, installed: true }
            : t
        );
      }

      // otherwise add it
      return [
        ...prev,
        {
          id: tileId,
          order: prev.length + 1,
          installed: true,
        }
      ];
    });
  };

  /* =========================
     REORDER (FUTURE)
  ========================= */
  const reorderTiles = (newTiles) => {
    setTiles(newTiles);
  };

  return {
    tiles,
    setTiles,
    uninstallTile, // 🔥 USED NOW
    installTile,   // 🔥 FOR TILE STORE
    reorderTiles,  // 🔥 FOR DRAG + DROP
  };
}
