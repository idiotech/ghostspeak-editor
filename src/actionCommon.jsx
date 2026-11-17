import * as React from "react";
import {
  ArrayInput,
  BooleanInput,
  NumberInput,
  SimpleFormIterator,
  SelectInput,
  TextInput,
  ReferenceInput,
  AutocompleteInput,
  required,
  number,
  minValue,
  maxValue,
  CheckboxGroupInput,
  useGetOne,
} from "react-admin";

import InputAdornment from "@mui/material/InputAdornment";
import { longInputSx } from "./inputWidth";

import { ColorInput } from "./ColorInput";
import TimeInput from "./timepicker";

import BluetoothIcon from "@mui/icons-material/Bluetooth";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import MessageIcon from "@mui/icons-material/Message";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import LocationOffIcon from "@mui/icons-material/LocationOff";
import AddLocationIcon from "@mui/icons-material/AddLocation";
import CancelIcon from "@mui/icons-material/Cancel";
import PhoneCallbackIcon from "@mui/icons-material/PhoneCallback";
import PhoneDisabledIcon from "@mui/icons-material/PhoneDisabled";
import MapIcon from "@mui/icons-material/Map";
import ReplyIcon from "@mui/icons-material/Reply";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import HourglassBottomIcon from "@mui/icons-material/HourglassEmpty";
import ImageIcon from "@mui/icons-material/Image";
import ButtonIcon from "@mui/icons-material/NavigateNext";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";

import LocationReferenceInput from "./LocationReferenceInput";
import SoundReferenceInput from "./SoundReferenceInput";
import ImageReferenceInput from "./ImageReferenceInput";
import {
  AlertPreview,
  DialogPreview,
  IntroPreview,
  NotificationPreview,
} from "./popupPreview";
import {
  usePhoneLook,
  CallPreviewPane,
  MarkerPreviewPane,
  GuideImagePreviewPane,
  IntroImagePreviewPane,
  ButtonStylePreviewPane,
  PopupStylePreviewPane,
  MapStylePreviewPane,
} from "./contentPreviews";
import { getCurrentScenarioName } from "./currentScenario";
import {
  buildCondition,
  DEFAULT_GEOFENCE_MODE,
  LEGACY_GEOFENCE_RADIUS,
} from "./publishExport";
import {
  getMainType,
  getButtons,
  getPrevDesc,
  getPrevId,
  hasDelay,
} from "./actionType";

export { getMainType, getButtons, getPrevDesc, getPrevId, buildCondition };

const destinations = [
  { id: "NOTIFICATION", name: "通知列" },
  { id: "APP", name: "對話視窗" },
  { id: "ALERT", name: "提示視窗" },
  { id: "INTRO", name: "首頁" },
  { id: "DIALER", name: "撥號視窗" },
];
const dismissalDestinations = [
  { id: "APP", name: "對話視窗" },
  { id: "ALERT", name: "提示視窗" },
];
const soundModes = [
  { id: "STATIC_VOLUME", name: "固定音量" },
  { id: "DYNAMIC_VOLUME", name: "越遠越小聲" },
  { id: "BEACON_VOLUME", name: "依Beacon調整音量" },
];
const soundTypes = [
  { id: "MAIN", name: "主劇情" },
  { id: "BACKGROUND", name: "背景單次" },
  { id: "LOOP", name: "背景循環" },
];
const conditionTypes = [
  { id: "ALWAYS", name: "上個動作結束" },
  { id: "TEXT", name: "文字回應" },
  { id: "GEOFENCE", name: "GPS觸發" },
  { id: "BEACON", name: "Beacon觸發" },
];
const beaconTypes = [
  { id: "ENTER", name: "接近" },
  { id: "EXIT", name: "離開" },
];
// ARRIVE: the player has to reach the center, the radius only arms the fence;
// SIGHT: it fires as soon as the player is inside the radius, e.g. on seeing the target
const geofenceModes = [
  { id: "ARRIVE", name: "到達中心點" },
  { id: "SIGHT", name: "進入範圍即觸發（遠望目標）" },
];
// a radius players enter reliably with 10 to 20 m of GPS error, for new fences
const DEFAULT_GEOFENCE_RADIUS = 30;

const callTypes = [
  { id: "CONNECTING", name: "未接通" },
  { id: "CONNECTED", name: "接通" },
];
const comparisonTypes = [
  { id: "<=", name: "<=" },
  { id: "==", name: "==" },
  { id: ">=", name: ">=" },
];
const operationTypes = [
  { id: "+", name: "+" },
  { id: "-", name: "-" },
  { id: "=", name: "=" },
];

// volumes are fractions of the file's own volume
const validateVolume = [required(), number(), minValue(0), maxValue(1)];

const validateInteger = (value) => {
  if (value === null || value === undefined || value === "") {
    return undefined; // Let 'required' validator handle empty values if needed
  }
  if (!Number.isInteger(Number(value))) {
    return "必須是整數"; // Or a custom message like 'Must be an integer'
  }
  return undefined; // No error
};

const getConditionIcon = (record) => {
  const conds = record.prevs
    ? new Set(record.prevs.flatMap((p) => p.conditionType))
    : new Set();
  const delay = hasDelay(record);

  return (
    <>
      {conds.has("TEXT") ? <ReplyIcon /> : <></>}
      {conds.has("BEACON") ? <BluetoothIcon /> : <></>}
      {conds.has("GEOFENCE") ? <MyLocationIcon /> : <></>}
      {conds.has("ALWAYS") ? <ArrowForwardIcon /> : <></>}
      {delay ? <HourglassBottomIcon /> : <></>}
    </>
  );
};

const getContentIcon = (record) => {
  return (
    <>
      {record.hasSound ? <AudiotrackIcon /> : <></>}
      {record.hasPopup ? <MessageIcon /> : <></>}
      {record.hasIncomingCall ? <PhoneCallbackIcon /> : <></>}
      {record.hasPopupDismissal ? <CancelIcon /> : <></>}
      {record.hasMarker ? <AddLocationIcon /> : <></>}
      {record.hasMarkerRemoval ? <LocationOffIcon /> : <></>}
      {record.hasHangUp ? <PhoneDisabledIcon /> : <></>}
      {record.hasMapStyle ? <MapIcon /> : <></>}
      {record.hasIntroImage ? <ImageIcon /> : <></>}
      {record.hasButtonStyle ? <ButtonIcon /> : <></>}
      {record.hasSilence ? <VolumeOffIcon /> : <></>}
    </>
  );
};

const locationCondition = () => (
  <>
    <LocationReferenceInput
      label="中心點"
      source="geofenceCenter"
      reference="locations"
      validate={[required()]}
      perPage={1000}
    >
      <AutocompleteInput optionText="name" />
    </LocationReferenceInput>
    <br />
    <NumberInput
      label="範圍 (整數)"
      source="geofenceRadius"
      validate={[required(), number(), validateInteger]}
      step={1}
      defaultValue={DEFAULT_GEOFENCE_RADIUS}
      slotProps={unit("公尺")}
    />
    <br />
    <SelectInput
      label="觸發方式"
      source="geofenceMode"
      choices={geofenceModes}
      defaultValue={DEFAULT_GEOFENCE_MODE}
      validate={[required()]}
    />
  </>
);
const beaconCondition = () => (
  <>
    <ReferenceInput source="beacon" reference="beacons">
      <AutocompleteInput
        label="Beacon"
        optionText="name"
        validate={[required()]}
        sx={longInputSx}
      />
    </ReferenceInput>
    <SelectInput
      label="模式"
      source="beaconType"
      choices={beaconTypes}
      validate={[required()]}
    />
    <br />
    <NumberInput
      label="訊號值 (整數)"
      source="beaconThreshold"
      validate={[required(), number(), validateInteger]}
    />
  </>
);

// the create page's prefill for an action that follows `id`
export function nextStepState(id) {
  return { record: { prevs: [{ prev: id, conditionType: "ALWAYS" }] } };
}

export { longInputSx };

// shows a unit such as 公尺 inside a NumberInput
const unit = (text) => ({
  input: {
    endAdornment: <InputAdornment position="end">{text}</InputAdornment>,
  },
});

function addDelay(formData, name) {
  return (
    <>
      <BooleanInput
        label="進階時間控制"
        source={name + "AdvancedTime"}
        defaultValue={false}
      />
      {formData[name + "AdvancedTime"] && addAdvancedDelay(name)}
      {!formData[name + "AdvancedTime"] && (
        <NumberInput
          label="延遲時間(毫秒)"
          style={{ width: 150 }}
          min={0}
          step={1}
          source={name + "Delay"}
          validate={[number()]}
        />
      )}
    </>
  );
}

function addAdvancedDelay(name) {
  return (
    <>
      <div>
        延遲時間 <br />
        <NumberInput
          label="小時"
          style={{ width: 100 }}
          min={0}
          step={1}
          source={name + "DelayHour"}
          validate={[number()]}
        />
        <NumberInput
          style={{ width: 100 }}
          min={0}
          max={59}
          step={1}
          label="分鐘"
          source={name + "DelayMinute"}
          validate={[number()]}
        />
        <NumberInput
          label="秒鐘"
          style={{ width: 100 }}
          min={0}
          max={59}
          step={1}
          source={name + "DelaySecond"}
          validate={[number()]}
        />
        <NumberInput
          label="毫秒"
          style={{ width: 130 }}
          min={0}
          max={999}
          step={1}
          source={name + "DelayMilli"}
          validate={[number()]}
        />
      </div>
      <div>
        發送時刻 <br />
        <TimeInput label="發送時刻" source={name + "Time"} />
      </div>
      <div>
        隨機前後調整 <br />
        <NumberInput
          label="小時"
          style={{ width: 100 }}
          min={0}
          step={1}
          source={name + "RandomHour"}
          validate={[number()]}
        />
        <NumberInput
          style={{ width: 100 }}
          min={0}
          max={59}
          step={1}
          label="分鐘"
          source={name + "RandomMinute"}
          validate={[number()]}
        />
        <NumberInput
          label="秒鐘"
          style={{ width: 100 }}
          min={0}
          max={59}
          step={1}
          source={name + "RandomSecond"}
          validate={[number()]}
        />
        <NumberInput
          label="毫秒"
          style={{ width: 130 }}
          min={0}
          max={999}
          step={1}
          source={name + "RandomMilli"}
          validate={[number()]}
        />
      </div>
    </>
  );
}

const soundInput = (formData, enableDelay) => (
  <>
    <SoundReferenceInput
      label="音檔"
      source="soundId"
      reference="sounds"
      sort={{ field: "lastupdate", order: "DESC" }}
      perPage={1000}
      validate={[required()]}
    >
      <AutocompleteInput optionText="name" />
    </SoundReferenceInput>

    <BooleanInput
      label="進階聲音控制"
      source="advancedSound"
      defaultValue={false}
    />

    {formData.advancedSound && (
      <>
        <SelectInput
          label="聲音類型"
          source="soundType"
          choices={soundTypes}
          defaultValue="MAIN"
        />
        <SelectInput
          label="音量模式"
          source="mode"
          choices={soundModes}
          defaultValue="STATIC_VOLUME"
        />
      </>
    )}
    <br />
    {formData.mode === "DYNAMIC_VOLUME" && formData.advancedSound && (
      <>
        <span>中心點音量值為1(檔案原始音量)，到圓周的音量為「最小音量」</span>
        <div>
          <LocationReferenceInput
            label="中心點"
            source="soundCenterId"
            reference="locations"
            validate={[required()]}
            perPage={1000}
          >
            <AutocompleteInput optionText="name" />
          </LocationReferenceInput>
          <NumberInput
            label="最小音量"
            source="minVolume"
            defaultValue={0}
            min={0}
            max={1}
            step={0.1}
            validate={validateVolume}
            helperText="0-1之間"
          />
          <br />
          <NumberInput
            label="半徑 (整數)"
            source="range"
            defaultValue={30}
            validate={[required(), number(), validateInteger]}
            slotProps={unit("公尺")}
          />
        </div>
      </>
    )}
    {formData.mode === "BEACON_VOLUME" && formData.advancedSound && (
      <>
        <div>
          <ReferenceInput source="beaconForSound" reference="beacons">
            <AutocompleteInput
              label="Beacon"
              validate={[required()]}
              optionText="name"
              sx={longInputSx}
            />
          </ReferenceInput>
          <br />
          <NumberInput
            label="最小音量"
            source="beaconMinVolume"
            min={0}
            max={1}
            step={0.1}
            validate={validateVolume}
            helperText="0-1之間"
          />
          <NumberInput
            label="最小音量訊號值 (整數)"
            sx={{ width: 220 }}
            source="beaconMinValue"
            validate={[required(), number(), validateInteger]}
          />
          <br />
          <NumberInput
            label="最大音量訊號值 (整數)"
            sx={{ width: 220 }}
            source="beaconMaxValue"
            validate={[required(), number(), validateInteger]}
          />
        </div>
      </>
    )}
    {formData.soundType === "MAIN" && formData.advancedSound && (
      <div>
        <NumberInput
          label="正文秒數 (整數)"
          source="speechLength"
          validate={[number(), validateInteger]}
        />
        播放到超過正文秒數之後，如果與下一個音檔重疊，則開始淡出。不淡出則不必設。
        <br />
        <NumberInput
          label="淡出秒數 (整數)"
          source="fadeOutSeconds"
          validate={[number(), validateInteger]}
        />
        在幾秒內淡出到消失。設為0代表立即停止。
      </div>
    )}
    {enableDelay && addDelay(formData, "sound")}
  </>
);

const validateBeforeSubmit = (value) => {
  const dests = value.destinations || [];

  const error = {};
  if (value.hasPopup) {
    if (
      dests &&
      dests.filter(
        (d) => d === "APP" || d === "ALERT" || d === "INTRO" || d === "DIALER"
      ).length >= 2
    ) {
      error.destinations =
        "「前情提要」/「對話視窗」/「提示視窗」/「撥號視窗」只能選其中一個";
    } else if (dests.length === 0) {
      error.destinations = "至少要選其中一個";
    } else if (
      dests.filter((d) => d === "ALERT" || d === "INTRO").length >= 1 &&
      (!value.choices || value.choices.length == 0) &&
      !value.allowTextReply &&
      !value.allowNoReply
    ) {
      error.allowTextReply =
        "必須要有回應方式 (按鈕或打字)，否則圖文視窗不會自行消失！";
    }
  }

  if (
    value.hasIntroImage &&
    !value.introBackground &&
    !value.introLogo &&
    !value.mapLogo
  ) {
    error.hasIntroImage = "背景和logo至少要有一個";
  }
  return error;
};

// a component (not a plain function) because it uses hooks
const PopupInput = ({ formData, enableDelay }) => {
  const initialDestination = React.useMemo(() => ["ALERT"], []);
  const dests = formData.destinations || [];
  const hasDialog = dests.includes("APP");
  const hasAlert = dests.includes("ALERT");
  const blockingPopup = hasAlert || dests.includes("INTRO");
  const hasDialer = dests.includes("DIALER");
  const hasIntro = dests.includes("INTRO");
  const hasNotification = dests.includes("NOTIFICATION");
  const contentPane = (
    <>
      <h4>
        <u>圖文內容</u>
      </h4>
      {!hasDialer ? (
        <table border="1" cellPadding="10">
          <tr>
            <td>
              <TextInput
                multiline
                label="文字"
                sx={longInputSx}
                source="text"
              />
            </td>
          </tr>
          <tr>
            <td>
              {!hasIntro ? (
                <ArrayInput label="圖片" source="pictures">
                  <SimpleFormIterator>
                    <ImageReferenceInput
                      label="圖檔"
                      source="pictureId"
                      reference="images"
                      sort={{
                        field: "lastupdate",
                        order: "DESC",
                      }}
                      perPage={1000}
                    />
                  </SimpleFormIterator>
                </ArrayInput>
              ) : (
                <>(要改變首頁背景圖片，請到「進階內容」→「首頁背景」)</>
              )}
            </td>
          </tr>
        </table>
      ) : (
        <>撥號視窗目前不支援圖文顯示</>
      )}
      {!hasDialer && (
        <div>
          <h4>
            <u>回應方式</u>
          </h4>
          <table border="1" cellPadding="10">
            {!formData.allowNoReply && (
              <tr>
                <td>
                  <ArrayInput label="回應按鈕" source="choices">
                    <SimpleFormIterator>
                      <TextInput source="choice" label="選擇" />
                    </SimpleFormIterator>
                  </ArrayInput>
                  {(formData.choices || []).some(
                    (c) => c && c.choice && c.choice.length > 8
                  ) && (
                    <div style={{ color: "#ed6c02" }}>
                      按鈕文字超過 8 個字，手機上可能換行或被截斷。
                    </div>
                  )}
                </td>
              </tr>
            )}
            {!formData.allowNoReply && (
              <tr>
                <td>
                  <BooleanInput
                    label="允許打字回應"
                    source="allowTextReply"
                    defaultValue={false}
                  />
                </td>
              </tr>
            )}
            {blockingPopup && (
              <tr>
                <td>
                  <BooleanInput
                    label="不需用戶回應 (我了解必須自行計時關閉視窗)"
                    source="allowNoReply"
                    defaultValue={false}
                  />
                </td>
              </tr>
            )}
          </table>
        </div>
      )}

      <h4>
        <u>顯示區域</u>
      </h4>
      <CheckboxGroupInput
        label="顯示於"
        source="destinations"
        choices={destinations}
        defaultValue={initialDestination}
      />
      {hasNotification && (
        <div style={{ color: "#757575", fontSize: 14 }}>
          iOS 的通知列不顯示按鈕。
        </div>
      )}
      <h4>
        <u>進階功能</u>
      </h4>
      {hasAlert && (
        <BooleanInput
          label="回覆後保留提示視窗"
          source="dontCloseAlertAfterReply"
          defaultValue={false}
        />
      )}
      {hasDialog && (
        <BooleanInput
          label="移除先前對話"
          source="clearDialog"
          defaultValue={false}
        />
      )}
      {enableDelay && addDelay(formData, "popup")}
    </>
  );
  // preview the first picture the author configured
  const firstPictureId = (formData.pictures || []).find(
    (p) => p && p.pictureId
  )?.pictureId;
  const { data: firstImage } = useGetOne(
    "images",
    { id: firstPictureId },
    { enabled: !!firstPictureId }
  );
  const firstImageSrc = firstPictureId && firstImage?.image?.src;

  // the sender's name and avatar head the message in the dialog
  const { data: sender } = useGetOne(
    "people",
    { id: formData.sender },
    { enabled: !!formData.sender }
  );
  const { data: senderImage } = useGetOne(
    "images",
    { id: sender?.userPortrait },
    { enabled: !!sender?.userPortrait }
  );
  const look = usePhoneLook();
  const previewProps = {
    text: formData.text,
    choices: getButtons(formData),
    allowTextReply: !!formData.allowTextReply && !formData.allowNoReply,
    imageSrc: firstImageSrc,
    look,
  };

  const previewPane = (
    <>
      <h4>
        <u>示意圖</u>
      </h4>
      依Android版佈局繪製，套用劇本中在此之前（沿著從開頭到這裡的路）設定的按鈕、面板顏色與首頁圖片；實際顯示仍依手機而定。
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 16,
          marginTop: 8,
        }}
      >
        {hasAlert && <AlertPreview {...previewProps} />}
        {hasDialog && (
          <DialogPreview
            {...previewProps}
            sender={
              sender && {
                name: sender.name,
                portraitSrc: senderImage?.image?.src,
              }
            }
          />
        )}
        {hasIntro && (
          <IntroPreview
            {...previewProps}
            scenarioName={getCurrentScenarioName()}
          />
        )}
        {hasNotification && (
          <NotificationPreview
            {...previewProps}
            sender={
              sender && {
                name: sender.name,
                portraitSrc: senderImage?.image?.src,
              }
            }
          />
        )}
        {hasDialer && (
          <img
            src="https://storage.googleapis.com/daqiaotou/editor/image/dialer.png"
            width="300"
          />
        )}
      </div>
    </>
  );
  return (
    <table border="0">
      <tr>
        <td
          style={{
            verticalAlign: "top",
            width: "1%",
            whiteSpace: "nowrap",
          }}
        >
          {contentPane}
        </td>
        <td style={{ verticalAlign: "top", horizontalAlign: "left" }}>
          {previewPane}
        </td>
      </tr>
    </table>
  );
};

const popupInput = (formData, enableDelay) => (
  <PopupInput formData={formData} enableDelay={enableDelay} />
);

const popupDismissalInput = (formData, enableDelay) => {
  return (
    <>
      <CheckboxGroupInput
        label="關閉"
        source="dismissalDestinations"
        choices={dismissalDestinations}
      />{" "}
      <br />
      {enableDelay && addDelay(formData, "dismissal")}
    </>
  );
};

const incomingCallInput = (formData, enableDelay) => (
  <>
    <TextInput label="來電人" source="caller" validate={[required()]} />
    <ImageReferenceInput
      label="圖示檔案"
      source="portrait"
      reference="images"
      validate={[required()]}
      sort={{ field: "lastupdate", order: "DESC" }}
      perPage={1000}
    />
    <SelectInput
      label="狀態"
      source="callStatus"
      choices={callTypes}
      defaultValue={"CONNECTING"}
    />{" "}
    <br />
    <CallPreviewPane
      formData={formData}
      status={formData.callStatus || "CONNECTING"}
    />
    {enableDelay && addDelay(formData, "incomingCall")}
  </>
);

const hangUpInput = (formdata, enableDelay) => (
  <>
    <TextInput label="來電人" source="caller" validate={[required()]} />
    <ImageReferenceInput
      label="圖示檔案"
      source="portrait"
      reference="images"
      validate={[required()]}
      sort={{ field: "lastupdate", order: "DESC" }}
      perPage={1000}
    />
    <CallPreviewPane formData={formdata} status="DISCONNECTED" />
    {enableDelay && addDelay(formdata, "hangUp")}
  </>
);

const markerInput = (formData, enableDelay) => (
  <>
    <TextInput label="標題" source="title" validate={[required()]} />
    <br />
    <ImageReferenceInput
      label="圖示檔案"
      source="markerIcon"
      reference="images"
      validate={[required()]}
      sort={{ field: "lastupdate", order: "DESC" }}
      perPage={1000}
    />
    <LocationReferenceInput
      label="座標"
      source="locationId"
      reference="locations"
      validate={[required()]}
      sort={{ field: "lastupdate", order: "DESC" }}
      perPage={1000}
    >
      <AutocompleteInput optionText="name" />
    </LocationReferenceInput>
    <br />
    <MarkerPreviewPane formData={formData} />
    {enableDelay && addDelay(formData, "marker")}
  </>
);

const markerRemovalInput = (formData, enableDelay) => (
  <>
    <ReferenceInput
      source="markerId"
      reference="actions"
      filter={{ hasMarker: true }}
      sort={{ field: "lastupdate", order: "DESC" }}
      perPage={1000}
    >
      <SelectInput
        label="圖釘"
        validate={[required()]}
        optionText="title"
        sx={longInputSx}
      />
    </ReferenceInput>
    <br />
    {enableDelay && addDelay(formData, "markerRemoval")}
  </>
);

const mapStyleInput = (formData, enableDelay) => (
  <>
    {!formData.satellite && (
      <ReferenceInput
        source="mapStyle"
        reference="mapStyles"
        sort={{ field: "lastupdate", order: "DESC" }}
        perPage={1000}
      >
        <SelectInput label="樣式" optionText="name" sx={longInputSx} />
      </ReferenceInput>
    )}
    <BooleanInput label="衛星地圖" source="satellite" defaultValue={false} />
    <br />
    <MapStylePreviewPane formData={formData} />
    {enableDelay && addDelay(formData, "mapStyle")}
  </>
);

const introImageInput = (formData, enableDelay) => (
  <>
    <ImageReferenceInput
      label="背景圖"
      source="introBackground"
      reference="images"
      sort={{ field: "lastupdate", order: "DESC" }}
      perPage={1000}
    />
    <BooleanInput
      label="不使用首頁Logo"
      source="noIntroLogo"
      defaultValue={true}
    />
    {!formData.noIntroLogo && (
      <>
        <ImageReferenceInput
          label="首頁logo"
          helperText="建議比例: 寬300 / 高280"
          source="introLogo"
          reference="images"
          sort={{ field: "lastupdate", order: "DESC" }}
          perPage={1000}
        />
        <BooleanInput
          label="向下相容模式(不要用)"
          source="advancedLogo"
          defaultValue={false}
        />
        {formData.advancedLogo && (
          <>
            <NumberInput
              label="Logo距頂"
              source="introLogoMarginTop"
              validate={[number()]}
            />
            <NumberInput
              label="Logo高度"
              source="introLogoHeight"
              validate={[number()]}
            />
            <NumberInput
              label="Logo寬度"
              source="introLogoWidth"
              validate={[number()]}
            />
          </>
        )}
      </>
    )}
    <ColorInput label="首頁文字顏色" source="introTextColor" />
    <ImageReferenceInput
      label="地圖頁logo"
      helperText="建議比例: 寬62 / 高100"
      source="mapLogo"
      reference="images"
      sort={{ field: "lastupdate", order: "DESC" }}
      perPage={1000}
    />
    <br />
    <IntroImagePreviewPane formData={formData} />
    {enableDelay && addDelay(formData, "introImage")}
  </>
);

const buttonStyleInput = (formData, enableDelay) => (
  <>
    <ColorInput label="背景顏色" source="backgroundColor" />
    <ColorInput label="文字顏色" source="textColor" />
    <ButtonStylePreviewPane formData={formData} />
    {enableDelay && addDelay(formData, "buttonStyle")}
  </>
);

const popupStyleInput = (formData, enableDelay) => (
  <>
    <ColorInput label="提示文字顏色" source="alertTextColor" />
    <ColorInput
      label="面板顏色"
      helperText="含透明度，例如 #59202020"
      source="panelColor"
    />
    <PopupStylePreviewPane formData={formData} />
    {enableDelay && addDelay(formData, "popupStyle")}
  </>
);

const variableUpdateInput = () => (
  <ArrayInput label="更新變數" source="variableUpdates">
    <SimpleFormIterator>
      <ReferenceInput source="variable" reference="variables">
        <AutocompleteInput
          label="變數"
          validate={[required()]}
          optionText="name"
          sx={longInputSx}
        />
      </ReferenceInput>
      <SelectInput
        label="運算"
        source="operation"
        choices={operationTypes}
        validate={[required()]}
      />
      <NumberInput
        label="值 (整數)"
        source="value"
        validate={[required(), validateInteger]}
      />
    </SimpleFormIterator>
  </ArrayInput>
);

const endgameInput = (formData, enableDelay) => (
  <>
    <BooleanInput
      label="結束活動，返回劇本選擇畫面"
      source="endgame"
      defaultValue={false}
    />
    <br />
    {enableDelay && addDelay(formData, "endgame")}
  </>
);

const guideImageInput = (formData, enableDelay) => (
  <>
    <ImageReferenceInput
      label="指示圖"
      source="guideImage"
      reference="images"
      sort={{ field: "lastupdate", order: "DESC" }}
      perPage={1000}
    />
    <br />
    <GuideImagePreviewPane formData={formData} />
    {enableDelay && addDelay(formData, "guideImage")}
  </>
);

const guideImageRemovalInput = (formData, enableDelay) => (
  <>{enableDelay && addDelay(formData, "guideImageRemoval")}</>
);

const silenceInput = (formData, enableDelay) => (
  <>
    <ReferenceInput
      source="silencedSound"
      reference="actions"
      sort={{ field: "lastupdate", order: "DESC" }}
      filter={{ hasSound: true }}
      perPage={1000}
    >
      <SelectInput label="聲音" optionText="name" sx={longInputSx} />
    </ReferenceInput>
    <div>
      <NumberInput
        label="淡出秒數 (整數)"
        source="forceFadeOutSeconds"
        validate={[number(), validateInteger]}
      />
      在幾秒內淡出到消失。設為0代表立即停止。
    </div>
    {enableDelay && addDelay(formData, "silence")}
  </>
);

export {
  destinations,
  soundModes,
  soundTypes,
  conditionTypes,
  beaconTypes,
  callTypes,
  operationTypes,
  comparisonTypes,
  getConditionIcon,
  getContentIcon,
  locationCondition,
  beaconCondition,
  DEFAULT_GEOFENCE_RADIUS,
  LEGACY_GEOFENCE_RADIUS,
  soundInput,
  popupInput,
  popupDismissalInput,
  popupStyleInput,
  incomingCallInput,
  hangUpInput,
  markerInput,
  markerRemovalInput,
  mapStyleInput,
  validateBeforeSubmit,
  introImageInput,
  buttonStyleInput,
  variableUpdateInput,
  endgameInput,
  guideImageInput,
  guideImageRemovalInput,
  silenceInput,
};
