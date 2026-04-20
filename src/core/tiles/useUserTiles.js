import { useState } from "react";

export default function useUserTiles() {

  const [tiles, setTiles] = useState([
    { id: "home", order: 1, installed: true },
    { id: "announcements", order: 2, installed: true },
    { id: "sermon", order: 3, installed: true },
  ]);

  /* =========================
     SORT TILES (SAFE + STABLE)
  ========================= */
  const getSortedTiles = (tileList) => {
    return [...tileList].sort((a, b) => a.order - b.order);
  };

  /* =========================
     GET INSTALLED ONLY
  ========================= */
  const getInstalledTiles = () => {
    return getSortedTiles(
      tiles.filter(t => t.installed)
    );
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

      // 🔥 REORDER INSTALLED ONLY
      const installed = updated.filter(t => t.installed);
      const uninstalled = updated.filter(t => !t.installed);

      const reorderedInstalled = installed.map((tile, index) => ({
        ...tile,
        order: index + 1,
      }));

      return [...reorderedInstalled, ...uninstalled];
    });
  };

  /* =========================
     INSTALL TILE
  ========================= */
  const installTile = (tileId) => {
    setTiles(prev => {

      const exists = prev.find(t => t.id === tileId);

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
     REORDER (FUTURE)
  ========================= */
  const reorderTiles = (newTiles) => {
    setTiles(newTiles);
  };

  /* =========================
     DEBUG (TEMP — REMOVE LATER)
  ========================= */
  console.log("ALL TILES:", tiles);
  console.log("INSTALLED TILES:", getInstalledTiles());

  /* =========================
     RETURN
  ========================= */
  return {
    tiles: getSortedTiles(tiles),
    installedTiles: getInstalledTiles(), // 🔥 NEW (use this in Dock if needed)
    setTiles,
    uninstallTile,
    installTile,
    reorderTiles,
  };
}
