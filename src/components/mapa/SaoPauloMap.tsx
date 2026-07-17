import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://api.maptiler.com/maps/019cc06d-fb8e-741d-b158-a17a30e87c08/style.json?key=AI17dHeoeJx6rUC1KlSL";

export default function SaoPauloMap() {
  return (
    <div className="h-full w-full rounded-xl overflow-hidden">
      <Map
        initialViewState={{
          longitude: -46.6333,
          latitude: -23.5505,
          zoom: 11,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
      />
    </div>
  );
}
