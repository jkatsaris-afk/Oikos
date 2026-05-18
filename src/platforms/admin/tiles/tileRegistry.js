import GlobalUsersApp from "./GlobalUsers/GlobalUsersApp";
import GlobalUsersWidget from "./GlobalUsers/GlobalUsersWidget";
import EduTestingAppsApp from "./EduTestingApps/EduTestingAppsApp";
import EduTestingAppsWidget from "./EduTestingApps/EduTestingAppsWidget";
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
  "edu-testing-apps": {
    id: "edu-testing-apps",
    page: EduTestingAppsApp,
    widget: EduTestingAppsWidget,
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
