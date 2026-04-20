import { useState } from "react";

export default function useUserTiles() {

  const [tiles, setTiles] = useState([
    { id: "home", order: 1, installed: true },
    { id: "announcements", order: 2, installed: true },
    { id: "sermon", order: 3, installed: true }, // 🔥 ADDED
  ]);

  /* =========================
     SORT TILES (ALWAYS SAFE)
  ========================= */
  const getSortedTiles = (tileList) => {
    return [...tileList].sort((a, b) => a.order - b.order);
  };

  /* =========================
     UNINSTALL TILE
  ========================= */
  const uninstallTile = (tileId) => {

    // 🔥 PROTECT SYSTEM TILES
    if (tileId === "home" || tileId === "store") return;

    setTiles(prev => {
      const updated = prev.map(tile =>
        tile.id === tileId
          ? { ...tile, installed: false }
          : tile
      );

      // 🔥 RE-ORDER INSTALLED TILES CLEANLY
      const installed = updated.filter(t => t.installed);
      const uninstalled = updated.filter(t => !t.installed);

      const reordered = installed.map((tile, index) => ({
        ...tile,
        order: index + 1,
      }));

      return [...reordered, ...uninstalled];
    });
  };

  /* =========================
     INSTALL TILE
  ========================= */
  const installTile = (tileId) => {
    setTiles(prev => {

      const exists = prev.find(t => t.id === tileId);

      // 🔥 GET NEXT ORDER SLOT
      const nextOrder =
        prev.filter(t => t.installed).length + 1;

      if (exists) {
        return prev.map(t =>
          t.id === tileId
            ? {
                ...t,
                installed: true,
                order: nextOrder,
              }
            : t
        );
      }

      return [
        ...prev,
        {
          id: tileId,
          order: nextOrder,
          installed: true,
        }
      ];
    });
  };

  /* =========================
     REORDER (FUTURE DRAG)
  ========================= */
  const reorderTiles = (newTiles) => {
    setTiles(newTiles);
  };

  /* =========================
     RETURN SORTED TILES
  ========================= */
  return {
    tiles: getSortedTiles(tiles),
    setTiles,
    uninstallTile,
    installTile,
    reorderTiles,
  };
}
