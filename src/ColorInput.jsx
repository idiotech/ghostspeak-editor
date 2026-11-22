import React from "react";
import { useInput, InputHelperText } from "react-admin";
import { Box, TextField } from "@mui/material";
import { besideInputSx } from "./inputWidth";
import { swatchColor, pickedColor } from "./colorValue";

// Replaces react-admin-color-input, which has no react-admin v4/v5 release.
// Stores the color as a hex string such as "#ffffff", or "#59202020" with
// the transparency first, as the app reads it. The browser's picker beside
// the text only knows #rrggbb: it shows the colour without its transparency,
// and picking keeps the transparency the value had.
export const ColorInput = ({ source, label, helperText, validate }) => {
  const { id, field, fieldState, formState, isRequired } = useInput({
    source,
    validate,
  });
  // as react-admin's own inputs: once the field is left or the form sent
  const error =
    fieldState.invalid && (fieldState.isTouched || formState.isSubmitted)
      ? fieldState.error?.message
      : null;
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 2 }}>
      <TextField
        {...field}
        id={id}
        label={label}
        required={isRequired}
        error={!!error}
        helperText={<InputHelperText error={error} helperText={helperText} />}
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
