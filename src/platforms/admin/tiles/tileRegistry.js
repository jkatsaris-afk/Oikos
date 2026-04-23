import GlobalUsersApp from "./GlobalUsers/GlobalUsersApp";
import GlobalUsersWidget from "./GlobalUsers/GlobalUsersWidget";
import TileStoreManagerApp from "./TileStoreManager/TileStoreManagerApp";
import TileStoreManagerWidget from "./TileStoreManager/TileStoreManagerWidget";

export const adminTileRegistry = {
  "global-users": {
    id: "global-users",
    page: GlobalUsersApp,
    widget: GlobalUsersWidget,
    system: false,
    noUninstall: false,
  },
  "tile-store-manager": {
    id: "tile-store-manager",
    page: TileStoreManagerApp,
    widget: TileStoreManagerWidget,
    system: false,
    noUninstall: false,
  },
};
