import React from "react";
import { StoredFileField } from "./StoredFileField";
import { required, TextInput, FileInput, FileField } from "react-admin";

import QuickCreateButton from "./QuickCreateButton";
import ReferenceWithQuickCreate from "./ReferenceWithQuickCreate";
import { validateSoundFile } from "./uploads";

const SoundQuickCreateButton = ({ source }) => (
  <QuickCreateButton
    resource="sounds"
    title="上傳音檔"
    ariaLabel="Upload Sound"
    source={source}
    fields={["name", "sound"]}
  >
    <TextInput label="名稱" source="name" validate={required()} fullWidth />
    <FileInput
      label="音檔"
      source="sound"
      validate={[required(), validateSoundFile]}
    >
      <StoredFileField />
    </FileInput>
  </QuickCreateButton>
);

const SoundReferenceInput = (props) => (
  <ReferenceWithQuickCreate
    {...props}
    quickCreate={SoundQuickCreateButton}
    preview={<FileField title={"音檔"} source="sound.src" />}
  />
);

export default SoundReferenceInput;
