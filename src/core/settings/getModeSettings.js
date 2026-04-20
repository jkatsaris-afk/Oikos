import HomeSettings from "../../platforms/display/modes/home/settings/HomeSettings";
import ChurchSettings from "../../platforms/church/settings/ChurchSettings";
import CampusSettings from "../../platforms/campus/settings/CampusSettings";

export function getModeSettings(mode) {
  switch (mode) {
    case "home":
      return <HomeSettings />;

    case "church":
      return <ChurchSettings />;

    case "campus":
      return <CampusSettings />;

    default:
      return <div>No settings for this mode yet</div>;
  }
}
