import { useMemo } from "react";
import { useGetList } from "react-admin";
import { getActions } from "./publishExport";

export const apiUrl =
  window.appConfigs?.api_url || "https://ghostspeak.floraland.tw";

// large enough to read whole collections; publishing a partial scenario
// would overwrite the live one
const allRecords = 10000;

// v3's useGetList returned records keyed by id; the publish code relies on that shape
function useGetMap(resource) {
  const { data, isSuccess } = useGetList(resource, {
    pagination: { page: 1, perPage: allRecords },
    sort: { field: "published_at", order: "DESC" },
  });
  const map = useMemo(
    () => Object.fromEntries((data || []).map((r) => [r.id, r])),
    [data]
  );
  return [map, isSuccess];
}

export const useAllData = () => {
  const [actions, actionsLoaded] = useGetMap("actions");
  const [locations, locationsLoaded] = useGetMap("locations");
  const [beacons, beaconsLoaded] = useGetMap("beacons");
  const [images, imagesLoaded] = useGetMap("images");
  const [sounds, soundsLoaded] = useGetMap("sounds");
  const [mapStyles, mapStylesLoaded] = useGetMap("mapStyles");
  const [broadcasts, broadcastsLoaded] = useGetMap("broadcasts");
  const [variables, variablesLoaded] = useGetMap("variables");
  const [people, peopleLoaded] = useGetMap("people");
  return {
    // false until every collection has loaded
    loaded:
      actionsLoaded &&
      locationsLoaded &&
      beaconsLoaded &&
      imagesLoaded &&
      soundsLoaded &&
      mapStylesLoaded &&
      broadcastsLoaded &&
      variablesLoaded &&
      peopleLoaded,
    actions,
    locations,
    beacons,
    images,
    sounds,
    mapStyles,
    broadcasts,
    variables,
    people,
  };
};

export { getActions };
