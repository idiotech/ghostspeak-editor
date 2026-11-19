import React from "react";
import { useInput } from "react-admin";
import { Box, TextField } from "@mui/material";
import { besideInputSx } from "./inputWidth";
import { swatchColor, pickedColor } from "./colorValue";

// Replaces react-admin-color-input, which has no react-admin v4/v5 release.
// Stores the color as a hex string such as "#ffffff", or "#59202020" with
// the transparency first, as the app reads it. The browser's picker beside
// the text only knows #rrggbb: it shows the colour without its transparency,
// and picking keeps the transparency the value had.
export const ColorInput = ({ source, label, helperText }) => {
  const { id, field } = useInput({ source });
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 2 }}>
      <TextField
        {...field}
        id={id}
        label={label}
        helperText={helperText}
        size="small"
        value={field.value || ""}
      />
      <Box sx={besideInputSx}>
        <input
          type="color"
          aria-label={label}
          value={swatchColor(field.value)}
          onChange={(event) =>
            field.onChange(pickedColor(field.value, event.target.value))
          }
        />
      </Box>
    </Box>
  );
};
