import TemplatePage from "../../templates/TemplatePage";
import { tileRegistry } from "../../core/tiles/tileRegistry";
import useUserTiles from "../../core/tiles/useUserTiles";

export default function TileStorePage() {
  const { tiles, setTiles } = useUserTiles();

  const toggleInstall = (id) => {
    setTiles(prev =>
      prev.map(t =>
        t.id === id ? { ...t, installed: !t.installed } : t
      )
    );
  };

  return (
    <TemplatePage title="Tile Store">

      {Object.values(tileRegistry).map(tile => {
        const userTile = tiles.find(t => t.id === tile.id);

        return (
          <div key={tile.id} style={{ marginBottom: 12 }}>

            <span>{tile.label}</span>

            {!tile.system && (
              <button onClick={() => toggleInstall(tile.id)}>
                {userTile?.installed ? "Remove" : "Install"}
              </button>
            )}

          </div>
        );
      })}

    </TemplatePage>
  );
}
