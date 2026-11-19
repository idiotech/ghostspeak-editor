import React from "react";
import { StoredImageField } from "./StoredFileField";
import { required, TextInput, ImageInput } from "react-admin";

import QuickCreateButton from "./QuickCreateButton";
import ReferenceWithQuickCreate from "./ReferenceWithQuickCreate";
import { MyImageField } from "./MyImageField";
import { validateImageFile } from "./uploads";

const ImageQuickCreateButton = ({ source }) => (
  <QuickCreateButton
    resource="images"
    title="上傳圖片"
    ariaLabel="Create image"
    source={source}
    fields={["name", "image"]}
  >
    <TextInput label="名稱" source="name" validate={required()} fullWidth />
    <ImageInput
      label="圖片"
      source="image"
      validate={[required(), validateImageFile]}
    >
      <StoredImageField />
    </ImageInput>
  </QuickCreateButton>
);

const ImageReferenceInput = (props) => (
  <ReferenceWithQuickCreate
    {...props}
    quickCreate={ImageQuickCreateButton}
    preview={<MyImageField source="image.src" />}
  />
);

export default ImageReferenceInput;
