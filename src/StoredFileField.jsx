import * as React from "react";
import { FileField, useRecordContext } from "react-admin";
import { MyImageField } from "./MyImageField";
import { fileTitleSource } from "./storedFile";

// Inside a FileInput or ImageInput: the stored file, named by its own file
// name. A fixed title="name" printed the word "name" for every file uploaded
// through the editor, which keeps the name in `title`.
export const StoredFileField = (props) => {
  const file = useRecordContext(props);
  return <FileField source="src" {...props} title={fileTitleSource(file)} />;
};

export const StoredImageField = (props) => {
  const file = useRecordContext(props);
  return (
    <MyImageField source="src" {...props} title={fileTitleSource(file)} />
  );
};
