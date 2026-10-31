// in src/posts.js
import * as React from "react";
// tslint:disable-next-line:no-var-requires
import {
  Datagrid,
  List,
  Create,
  Edit,
  TextField,
  TextInput,
  EditButton,
  DateTimeInput,
  FileField,
  FileInput,
  required,
  useRecordContext,
} from "react-admin";
import SimpleForm from "./SimpleForm";
import { longInputSx } from "./inputWidth";
import { getDeleteButton } from "./deleteResource";
import { useAllData } from "./serverCommon";
import { useUsage, UsedByField } from "./usage";

import { DummyList } from "./dummy";
import { getCurrentScenario, getCurrentScenarioName } from "./currentScenario";
const soundFilters = [
  <TextInput label="搜尋" source="name" alwaysOn key="name" />,
];

const Title = () => {
  const record = useRecordContext();
  return (
    <span>
      《{getCurrentScenarioName()}》聲音
      {record && record.name ? `：'${record.name}'` : ""}
    </span>
  );
};

// where a sound may be used
const soundReferences = { actions: ["soundId"], broadcasts: ["soundId"] };

const SoundDelete = (props) =>
  getDeleteButton(props, "sounds", "聲音", soundReferences);

// plays the file in place; nothing is downloaded until play is pressed
const PlayField = () => {
  const record = useRecordContext();
  const src = record?.sound?.src;
  if (!src) return null;
  return (
    <audio controls preload="none" src={src} style={{ height: 32, width: 260 }} />
  );
};

export const SoundList = () => {
  if (getCurrentScenario()) return <ScenarioSoundList />;
  else return <DummyList />;
};

const ScenarioSoundList = () => {
  const data = useAllData();
  const usage = useUsage(data, soundReferences);
  return (
    <List
      title={<Title />}
      perPage={100}
      sort={{ field: "name", order: "ASC" }}
      filters={soundFilters}
    >
      <Datagrid rowClick={false} bulkActionButtons={false}>
        <TextField label="編號" source="rowIndex" />
        <TextField label="名稱" source="name" />
        <PlayField label="試聽" />
        <FileField label="音檔" source="sound.src" title={"連結"} />
        <UsedByField label="使用於" usage={usage} />
        <EditButton label="" />
        <SoundDelete label="" redirect={false} />
      </Datagrid>
    </List>
  );
};

export const SoundCreate = () => (
  <Create title={<Title />}>
    <SimpleForm>
      <TextInput label="名稱" source="name" sx={longInputSx} />
      <FileInput label="音檔" source="sound" validate={required()}>
        <FileField source="src" title="name" />
      </FileInput>
    </SimpleForm>
  </Create>
);

export const SoundEdit = () => (
  <Edit title={<Title />} mutationMode="pessimistic">
    <SimpleForm>
      <TextInput readOnly source="id" />
      <TextInput label="名稱" source="name" sx={longInputSx} />
      <FileInput label="音檔" source="sound" validate={required()}>
        <FileField source="src" title="name" />
      </FileInput>
      <DateTimeInput label="建立時間" readOnly source="createdate" />
      <DateTimeInput label="修改時間" readOnly source="lastupdate" />
    </SimpleForm>
  </Edit>
);
