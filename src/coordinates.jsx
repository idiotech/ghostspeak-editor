import * as React from "react";
import { useFormContext } from "react-hook-form";

import {
  NumberInput,
  TextInput,
  required,
  number,
  useRecordContext,
} from "react-admin";

import { longInputSx } from "./actionCommon";
import { parseLatLng } from "./latLng";

const validateCoordinate = [required(), number()];

export const CoordinateInput = () => {
  const { getValues, setValue } = useFormContext();
  function handleLatLngChange(event) {
    const pair = parseLatLng(event.target.value);
    if (pair) {
      setValue("lat", pair.lat, { shouldDirty: true });
      setValue("lon", pair.lon, { shouldDirty: true });
    }
  }
  const { lat, lon } = getValues();
  const initialLatLng = lat && lon ? lat + "," + lon : "0,0";

  return (
    <>
      <span>
        <TextInput
          source="latLng"
          label="經緯度"
          onChange={handleLatLngChange}
          defaultValue={initialLatLng}
          sx={longInputSx}
        />
        <br />
        <NumberInput
          source="lat"
          label="緯度"
          validate={validateCoordinate}
          readOnly
        />
        &nbsp;
        <NumberInput
          source="lon"
          label="經度"
          validate={validateCoordinate}
          readOnly
        />
      </span>
    </>
  );
};

export const CoordinateField = () => {
  const record = useRecordContext() || {};
  return (
    <span>
      {record["lat"]},{record["lon"]}
    </span>
  );
};
