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
  const { data, isSuccess, error } = useGetList(resource, {
    pagination: { page: 1, perPage: allRecords },
    sort: { field: "published_at", order: "DESC" },
  });
  const map = useMemo(
    () => Object.fromEntries((data || []).map((r) => [r.id, r])),
    [data]
  );
  return [map, isSuccess, error];
}

export const useAllData = () => {
  const [actions, actionsLoaded, actionsError] = useGetMap("actions");
  const [locations, locationsLoaded, locationsError] = useGetMap("locations");
  const [beacons, beaconsLoaded, beaconsError] = useGetMap("beacons");
  const [images, imagesLoaded, imagesError] = useGetMap("images");
  const [sounds, soundsLoaded, soundsError] = useGetMap("sounds");
  const [mapStyles, mapStylesLoaded, mapStylesError] = useGetMap("mapStyles");
  const [broadcasts, broadcastsLoaded, broadcastsError] = useGetMap("broadcasts");
  const [variables, variablesLoaded, variablesError] = useGetMap("variables");
  const [people, peopleLoaded, peopleError] = useGetMap("people");
  return {
    // the actions alone are enough to draw the story
    actionsLoaded,
    // why a collection could not be read, if one could not
    error:
      actionsError ||
      locationsError ||
      beaconsError ||
      imagesError ||
      soundsError ||
      mapStylesError ||
      broadcastsError ||
      variablesError ||
      peopleError ||
      null,
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
