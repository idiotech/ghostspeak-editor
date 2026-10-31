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
  ImageInput,
  required,
  useRecordContext,
  useGetOne,
} from "react-admin";
import SimpleForm from "./SimpleForm";
import { longInputSx } from "./inputWidth";

import { MyImageField } from "./MyImageField";
import { DummyList } from "./dummy";
import { getCurrentScenario, getCurrentScenarioName } from "./currentScenario";
import { getDeleteButton } from "./deleteResource";
import { useAllData } from "./serverCommon";
import { useUsage, UsedByField } from "./usage";

const imageFilters = [
  <TextInput label="搜尋" source="name" alwaysOn key="name" />,
];

const Title = () => {
  const record = useRecordContext();
  return (
    <span>
      《{getCurrentScenarioName()}》圖片
      {record && record.name ? `：'${record.name}'` : ""}
    </span>
  );
};

// where an image may be used
const imagePaths = [
  "pictures.pictureId",
  "introBackground",
  "introLogo",
  "mapLogo",
  "portrait",
  "markerIcon",
  "guideImage",
];
const imageReferences = {
  actions: imagePaths,
  broadcasts: imagePaths,
  people: ["userPortrait"],
};

export const ImageList = () => {
  if (getCurrentScenario()) return <ScenarioImageList />;
  else return <DummyList />;
};

const ScenarioImageList = () => {
  const data = useAllData();
  // the scenario's cover is the one user outside the scenario's collections
  const { data: scenario } = useGetOne("scenarios", {
    id: getCurrentScenario(),
  });
  const cover = React.useMemo(
    () =>
      scenario?.pictureId
        ? [{ id: scenario.pictureId, kind: "劇本封面", name: scenario.name }]
        : [],
    [scenario]
  );
  const usage = useUsage(data, imageReferences, cover);
  return (
    <List title={<Title />} filters={imageFilters}>
      <Datagrid rowClick={false} bulkActionButtons={false}>
        <TextField label="編號" source="rowIndex" />
        <TextField label="名稱" source="name" />
        <MyImageField label="圖片" source="image.src" />
        <UsedByField label="使用於" usage={usage} />
        <EditButton label="" />
        <ImageDelete label="" redirect={false} />
      </Datagrid>
    </List>
  );
};

const ImageDelete = (props) =>
  getDeleteButton(props, "images", "圖片", {
    ...imageReferences,
    scenarios: ["pictureId"],
  });

export const ImageCreate = () => (
  <Create title={<Title />}>
    <SimpleForm>
      <TextInput label="名稱" source="name" sx={longInputSx} />
      <ImageInput label="圖片" source="image" validate={required()}>
        <MyImageField source="src" title="name" />
      </ImageInput>
      <>(圖釘建議大小： 150 x 150)</>
    </SimpleForm>
  </Create>
);

export const ImageEdit = () => (
  <Edit title={<Title />} mutationMode="pessimistic">
    <SimpleForm>
      <TextInput readOnly source="id" />
      <TextInput label="名稱" source="name" sx={longInputSx} />
      <ImageInput label="圖片" source="image" validate={required()}>
        <MyImageField source="src" title="name" />
      </ImageInput>
      <>(圖釘建議大小： 150 x 150)</>
      <DateTimeInput label="建立時間" readOnly source="createdate" />
      <DateTimeInput label="修改時間" readOnly source="lastupdate" />
    </SimpleForm>
  </Edit>
);
