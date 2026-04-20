import { Grid } from "lucide-react";

export default function TileDesignTemplate({
  icon: Icon = Grid,
  label = "New Tile",
}) {
  return {
    icon: Icon,
    label,
    color: "#1f2937",
    background: "rgba(255,255,255,0.85)",
  };
}
