import * as React from "react";
import {
  ArrayInput,
  BooleanInput,
  SimpleFormIterator,
  Datagrid,
  List,
  Create,
  Edit,
  SimpleForm,
  TextField,
  TextInput,
  EditButton,
  CreateButton,
  SelectInput,
  ReferenceInput,
  ReferenceArrayInput,
  ChipField,
  FormDataConsumer,
  required,
  FunctionField,
  AutocompleteArrayInput,
  ArrayField,
  ReferenceField,
  Toolbar,
  SaveButton,
  useNotify,
  useRedirect,
  useRecordContext,
  NumberInput,
  Button,
  Confirm,
  useDataProvider,
  useRefresh,
  AutocompleteInput,
  useGetOne,
} from "react-admin";
import FlagIcon from "@mui/icons-material/Flag";

import {
  conditionTypes,
  getConditionIcon,
  getContentIcon,
  locationCondition,
  beaconCondition,
  soundInput,
  popupInput,
  popupDismissalInput,
  incomingCallInput,
  hangUpInput,
  markerInput,
  markerRemovalInput,
  mapStyleInput,
  introImageInput,
  buttonStyleInput,
  popupStyleInput,
  variableUpdateInput,
  modalImage,
  validateBeforeSubmit,
  comparisonTypes,
  endgameInput,
  guideImageInput,
  guideImageRemovalInput,
  silenceInput,
  getPrevDesc,
  longInputSx,
} from "./actionCommon";

import { getRecordField } from "./utils";
import { getDeleteButton } from "./deleteResource";
import { useAllData } from "./serverCommon";
import { AllDataContext, BrokenReferencesField } from "./brokenReferences";
import { DummyList } from "./dummy";
import { getCurrentScenario, getCurrentScenarioName } from "./currentScenario";

const actionFilters = [
  <TextInput label="Search" source="name" alwaysOn key="name" />,
];

const Title = () => {
  const record = useRecordContext();
  return (
    <span>
      《{getCurrentScenarioName()}》動作
      {record && record.name ? `：'${record.name}'` : ""}
    </span>
  );
};
const getRowIndex = (record) => {
  const key = `a-${record.id}`;
  return <div>{localStorage.getItem(key)}</div>;
};

export const ActionList = () => {
  if (getCurrentScenario()) return <ScenarioActionList />;
  else return <DummyList />;
};

const ScenarioActionList = () => {
  const data = useAllData();
  return (
    <AllDataContext.Provider value={data}>
      <List title={<Title />} perPage={100} filters={actionFilters}>
        <Datagrid rowClick={false}>
          <FunctionField label="編號" render={getRowIndex} />
          <BrokenReferencesField label="檢查" />
          <FirstActionButton label="開頭" />
          <TextField label="名稱" source="name" />
          <FunctionField label="條件" render={getConditionIcon} />
          <FunctionField label="內容" render={getContentIcon} />
          <EditButton label="編輯" />
          <ArrayField label="上一步" source="prevs">
            <Datagrid rowClick={false}>
              <ReferenceField label="" source="prev" reference="actions">
                <ChipField source="name" />
              </ReferenceField>
            </Datagrid>
          </ArrayField>
          <NextButton source="id" label="下一步" />
          <ActionDelete />
        </Datagrid>
      </List>
    </AllDataContext.Provider>
  );
};

// refuses while another action follows this one or excludes it
const ActionDelete = (props) =>
  getDeleteButton(props, "actions", "動作", {
    actions: ["prevs.prev", "exclusiveWith"],
  });

// flags the initial action; on any other row, makes that action the initial one
// and clears the flag everywhere else, so the scenario keeps a single start
const FirstActionButton = () => {
  const record = useRecordContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  if (!record) return null;
  if (record.firstAction) return <FlagIcon color="primary" titleAccess="開頭" />;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // the list may be filtered, so look up every flagged action
      const { data: current } = await dataProvider.getList("actions", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "id", order: "ASC" },
        filter: { firstAction: true },
      });
      await Promise.all(
        current.map((a) =>
          dataProvider.update("actions", {
            id: a.id,
            data: { firstAction: false },
            previousData: a,
          })
        )
      );
      await dataProvider.update("actions", {
        id: record.id,
        data: { firstAction: true },
        previousData: record,
      });
      notify(`已將《${record.name}》設為開頭`, { type: "info" });
      refresh();
    } catch (e) {
      notify(`設定開頭失敗：${e.message}`, { type: "error" });
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button label="設為開頭" onClick={() => setOpen(true)} disabled={saving} />
      <Confirm
        isOpen={open}
        loading={saving}
        title={`將《${record.name}》設為開頭`}
        content="原本的開頭動作將不再是開頭，需要時請替它設定前一步。確定嗎？"
        onConfirm={handleConfirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

// saves, then opens the create page with this action as the previous step
const ActionSaveButton = ({ label }) => {
  const notify = useNotify();
  const redirect = useRedirect();
  return (
    <SaveButton
      label={label}
      type="button"
      mutationOptions={{
        onSuccess: (data) => {
          // Edit is pessimistic, so the update is already saved
          notify("ra.notification.updated", {
            type: "info",
            messageArgs: { smart_count: 1 },
          });
          redirect("create", "actions", undefined, undefined, {
            record: { prevs: [{ prev: data.id, conditionType: "ALWAYS" }] },
          });
        },
      }}
    />
  );
};

const EditToolbar = () => {
  const record = useRecordContext();
  return (
    <Toolbar>
      <span>
        <SaveButton label="儲存" /> &nbsp;
        {record && record.id && <ActionSaveButton label="儲存並建下一步" />}
      </span>
    </Toolbar>
  );
};

// the reply text a TEXT condition waits for; when the previous action is a
// dialog with buttons, offers those buttons instead of a free text field so the
// author does not have to retype them
const UserReplyInput = ({ prev }) => {
  const { data: prevAction } = useGetOne(
    "actions",
    { id: prev },
    { enabled: !!prev }
  );
  const buttons = ((prevAction && prevAction.choices) || [])
    .map((c) => c && c.choice)
    .filter((c) => c);
  if (buttons.length === 0) {
    return (
      <TextInput
        multiline
        label="文字"
        source="userReply"
        sx={longInputSx}
        validate={[required()]}
      />
    );
  }
  const allowTextReply = !!prevAction.allowTextReply;
  return (
    <FormDataConsumer>
      {({ scopedFormData }) => {
        const current = scopedFormData && scopedFormData.userReply;
        const choices = buttons.map((b) => ({ id: b, name: b }));
        // keep a value that no longer matches any button visible, and say so
        const stale = current && !buttons.includes(current);
        if (stale) choices.push({ id: current, name: current });
        return (
          <AutocompleteInput
            label="文字"
            source="userReply"
            choices={choices}
            sx={longInputSx}
            validate={[required()]}
            onCreate={
              allowTextReply ? (text) => ({ id: text, name: text }) : undefined
            }
            createLabel="輸入其他文字..."
            createItemLabel="使用「%{item}」"
            helperText={
              stale && !allowTextReply
                ? "上個動作沒有這個按鈕，請重新選擇"
                : allowTextReply
                ? "可選按鈕，或輸入打字回應的文字"
                : "上個動作的回應按鈕"
            }
          />
        );
      }}
    </FormDataConsumer>
  );
};

const InputForm = (props) => {
  return (
    <SimpleForm validate={validateBeforeSubmit} toolbar={<EditToolbar />}>
      <FormDataConsumer>
        {({ formData }) => {
          const enableDelay =
            formData.prevs &&
            !formData.prevs.some(
              (c) =>
                !c ||
                c.conditionType == "GEOFENCE" ||
                c.conditionType == "BEACON"
            );
          const forbidDelay = !enableDelay && formData.prevs;

          const forbidDelayNotification = forbidDelay && (
            <>(因系統限制，Geofence和Beacon觸發時，無法使用延遲。)</>
          );
          console.log("prevs", formData.prevs);
          function prevRenderer(p) {
            return p.name + " ➜ " + getPrevDesc(p) + "之後";
          }
          return (
            <>
              {props.showid === "true" ? (
                <TextInput source="id" readOnly />
              ) : (
                <></>
              )}{" "}
              <br />
              <TextInput
                label="名稱"
                source="name"
                validate={[required()]}
                sx={longInputSx}
              />{" "}
              <br />
              <h3>觸發順序</h3>
              <hr />
              <BooleanInput label="開頭" source="firstAction" /> <br />
              {formData.firstAction || (
                <ArrayInput label="前一步" source="prevs">
                  <SimpleFormIterator>
                    <ReferenceInput
                      source="prev"
                      reference="actions"
                      sort={{
                        field: "lastupdate",
                        order: "DESC",
                      }}
                      perPage={1000}
                    >
                      <SelectInput
                        label="接續"
                        sx={longInputSx}
                        optionText={prevRenderer}
                      />
                    </ReferenceInput>
                    <SelectInput
                      label="觸發條件"
                      source="conditionType"
                      choices={conditionTypes}
                    />
                    <FormDataConsumer>
                      {({
                        scopedFormData, // The data for this item of the ArrayInput
                      }) => (
                        <>
                          {scopedFormData &&
                            scopedFormData.conditionType === "GEOFENCE" &&
                            locationCondition()}
                          {scopedFormData &&
                            scopedFormData.conditionType === "BEACON" &&
                            beaconCondition()}
                          {scopedFormData &&
                            scopedFormData.conditionType === "TEXT" && (
                              <>
                                {!scopedFormData.fallback && (
                                  <UserReplyInput prev={scopedFormData.prev} />
                                )}
                                {
                                  <BooleanInput
                                    label="任意文字"
                                    source="fallback"
                                    defaultValue={
                                      scopedFormData.userReply === "fallback:"
                                    }
                                  />
                                }
                                {
                                  <BooleanInput
                                    label="設為變數"
                                    source="saveAsVariable"
                                  />
                                }
                                {scopedFormData.saveAsVariable && (
                                  <TextInput
                                    label="變數名"
                                    source="asVariable"
                                    validate={[required()]}
                                  />
                                )}
                              </>
                            )}
                        </>
                      )}
                    </FormDataConsumer>
                  </SimpleFormIterator>
                </ArrayInput>
              )}
              {!formData.firstAction && (
                <BooleanInput label="進階流程控制" source="advancedFlow" />
              )}
              {!formData.firstAction && formData.advancedFlow && (
                <>
                  <ReferenceArrayInput
                    source="exclusiveWith"
                    reference="actions"
                    sort={{
                      field: "lastupdate",
                      order: "DESC",
                    }}
                    perPage={1000}
                  >
                    <AutocompleteArrayInput
                      label="互斥於"
                      optionText="name"
                      fullWidth
                    />
                  </ReferenceArrayInput>
                  <ArrayInput label="附加條件" source="preconditions">
                    <SimpleFormIterator>
                      <ReferenceInput
                        source="variable"
                        reference="variables"
                        sort={{
                          field: "lastupdate",
                          order: "DESC",
                        }}
                        perPage={1000}
                      >
                        <SelectInput
                          label="變數"
                          optionText="name"
                          sx={longInputSx}
                        />
                      </ReferenceInput>
                      <SelectInput
                        label="比較"
                        source="comparison"
                        choices={comparisonTypes}
                      />
                      <NumberInput label="數值" source="value" />
                    </SimpleFormIterator>
                  </ArrayInput>
                </>
              )}
              <h3>常用內容</h3>
              {forbidDelayNotification}
              <hr />
              {modalImage}
              <BooleanInput label="聲音" source="hasSound" />
              {formData.hasSound && soundInput(formData, enableDelay)}
              <hr />
              <BooleanInput label="圖文訊息" source="hasPopup" />
              {formData.hasPopup && popupInput(formData, enableDelay)}
              <hr />
              <BooleanInput label="關閉圖文框" source="hasPopupDismissal" />
              {formData.hasPopupDismissal &&
                popupDismissalInput(formData, enableDelay)}
              <hr />
              <BooleanInput label="新圖釘" source="hasMarker" />
              {formData.hasMarker && markerInput(formData, enableDelay)}
              <hr />
              <BooleanInput label="移除圖釘" source="hasMarkerRemoval" />
              {formData.hasMarkerRemoval &&
                markerRemovalInput(formData, enableDelay)}
              <hr />
              {endgameInput(formData, enableDelay)}
              <hr />
              <h3>進階內容</h3>
              <BooleanInput label="開啟進階內容" source="advancedActionType" />
              {forbidDelayNotification}
              <hr />
              {formData.advancedActionType && (
                <>
                  <ReferenceInput
                    source="sender"
                    reference="people"
                    sort={{
                      field: "lastupdate",
                      order: "DESC",
                    }}
                    perPage={1000}
                  >
                    <SelectInput label="發送者" optionText="name" />
                  </ReferenceInput>
                  <BooleanInput label="停止聲音" source="hasSilence" />
                  {formData.hasSilence && silenceInput(formData, enableDelay)}
                  <hr />
                  <BooleanInput label="指示圖" source="hasGuideImage" />
                  {formData.hasGuideImage &&
                    guideImageInput(formData, enableDelay)}
                  <hr />
                  <BooleanInput
                    label="移除指示圖"
                    source="hasGuideImageRemoval"
                  />
                  {formData.hasGuideImageRemoval &&
                    guideImageRemovalInput(formData, enableDelay)}
                  <hr />
                  <BooleanInput label="來電" source="hasIncomingCall" />
                  {formData.hasIncomingCall &&
                    incomingCallInput(formData, enableDelay)}
                  <hr />
                  <BooleanInput label="掛電話" source="hasHangUp" />
                  {formData.hasHangUp && hangUpInput(formData, enableDelay)}
                  <hr />
                  <BooleanInput label="地圖樣式" source="hasMapStyle" />
                  {formData.hasMapStyle && mapStyleInput(formData, enableDelay)}
                  <hr />
                  <BooleanInput label="首頁背景" source="hasIntroImage" />
                  {formData.hasIntroImage &&
                    introImageInput(formData, enableDelay)}
                  <hr />
                  <BooleanInput label="按鈕顏色" source="hasButtonStyle" />
                  {formData.hasButtonStyle &&
                    buttonStyleInput(formData, enableDelay)}
                  <hr />
                  <BooleanInput label="視窗文字顏色" source="hasPopupStyle" />
                  {formData.hasPopupStyle &&
                    popupStyleInput(formData, enableDelay)}
                  <hr />
                  <BooleanInput label="更新變數" source="hasVariableUpdate" />
                  {formData.hasVariableUpdate && variableUpdateInput()}
                </>
              )}
            </>
          );
        }}
      </FormDataConsumer>
    </SimpleForm>
  );
};

export const ActionCreate = () => {
  return (
    <Create title={<Title />}>
      <InputForm showid="false" />
    </Create>
  );
};

// Every Edit page saves pessimistically: in the default undoable mode the
// write waits until the notification closes, and a publish in the meantime
// reads the old record from Firestore.
export const ActionEdit = () => {
  return (
    <Edit title={<Title />} mutationMode="pessimistic">
      <InputForm showid="true" />
    </Edit>
  );
};

function NextButton(props) {
  const record = useRecordContext(props);
  return (
    <CreateButton
      label="下一步"
      to="/actions/create"
      state={{
        record: {
          prevs: [
            {
              prev: getRecordField(record, "id"),
              conditionType: "ALWAYS",
            },
          ],
        },
      }}
    />
  );
}
