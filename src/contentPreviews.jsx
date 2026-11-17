import * as React from "react";
import { useGetOne } from "react-admin";
import {
  AlertPreview,
  CallPreview,
  IntroPreview,
  MapPreview,
} from "./popupPreview";
import { useGetMap } from "./serverCommon";
import { stylesAt, storyIndex, cssColor, mapColors } from "./phoneStyles";
import { getCurrentScenarioName } from "./currentScenario";

// the smaller phones shown beside a content section's inputs
const smallScale = 0.6;

// the address of a picture in the scenario's images, or null
export function useImageSrc(id) {
  const { data } = useGetOne("images", { id }, { enabled: !!id });
  return (id && data?.image?.src) || null;
}

// the form's fields that decide which styles apply and what they are
const styleFields = [
  "id",
  "firstAction",
  "prevs",
  "hasButtonStyle",
  "backgroundColor",
  "textColor",
  "hasPopupStyle",
  "alertTextColor",
  "panelColor",
  "hasIntroImage",
  "introBackground",
  "introLogo",
  "noIntroLogo",
  "advancedLogo",
  "introLogoMarginTop",
  "introLogoWidth",
  "introTextColor",
  "mapLogo",
];

const PhoneLookContext = React.createContext({});

// The story's own look where the action runs: the colours and pictures set
// by the nearest earlier button, popup and home page style, the action's own
// included, ready for the previews' `look`. Worked out once per form, and
// again only when the story or one of the fields above changes, not on
// every keystroke in the text.
export const PhoneLookProvider = ({ formData, children }) => {
  const [actions] = useGetMap("actions");
  const index = React.useMemo(() => storyIndex(actions), [actions]);
  const key = JSON.stringify(styleFields.map((f) => formData?.[f] ?? null));
  const styles = React.useMemo(
    () => stylesAt(formData || {}, actions, index),
    // formData is a new object on every render; key holds what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, actions, index]
  );
  const introBackgroundSrc = useImageSrc(styles.intro?.background);
  const introLogoSrc = useImageSrc(styles.intro?.logo);
  const mapLogoSrc = useImageSrc(styles.intro?.mapLogo);
  const look = React.useMemo(
    () => ({
      buttonBackground: cssColor(styles.button?.backgroundColor),
      buttonText: cssColor(styles.button?.textColor),
      alertText: cssColor(styles.popup?.alertTextColor),
      panel: cssColor(styles.popup?.panelColor),
      introBackgroundSrc,
      introLogoSrc,
      introNoLogo: !!styles.intro?.noLogo,
      introLogoPlacement: styles.intro && {
        marginTop: styles.intro.logoMarginTop,
        width: styles.intro.logoWidth,
      },
      introText: cssColor(styles.intro?.textColor),
      mapLogoSrc,
    }),
    [styles, introBackgroundSrc, introLogoSrc, mapLogoSrc]
  );
  return (
    <PhoneLookContext.Provider value={look}>{children}</PhoneLookContext.Provider>
  );
};

// the look worked out by the form's PhoneLookProvider; the app's own
// outside one
export const usePhoneLook = () => React.useContext(PhoneLookContext);

// the phones in a row under a heading, after a content section's inputs
export const PreviewRow = ({ note, children }) => (
  <div style={{ margin: "8px 0 16px" }}>
    <div style={{ fontSize: 14, color: "#757575", marginBottom: 6 }}>
      示意圖{note ? `：${note}` : ""}
    </div>
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      {children}
    </div>
  </div>
);

export const CallPreviewPane = ({ formData, status }) => {
  const portraitSrc = useImageSrc(formData.portrait);
  return (
    <PreviewRow>
      <CallPreview
        caller={formData.caller}
        portraitSrc={portraitSrc}
        status={status}
        scale={smallScale}
      />
    </PreviewRow>
  );
};

export const MarkerPreviewPane = ({ formData }) => {
  const iconSrc = useImageSrc(formData.markerIcon);
  const look = usePhoneLook();
  return (
    <PreviewRow note="標題在玩家點圖釘後才出現">
      <MapPreview
        marker={{ src: iconSrc, title: formData.title }}
        mapLogoSrc={look.mapLogoSrc}
        scale={smallScale}
      />
    </PreviewRow>
  );
};

export const GuideImagePreviewPane = ({ formData }) => {
  const guideImageSrc = useImageSrc(formData.guideImage);
  const look = usePhoneLook();
  return (
    <PreviewRow>
      <MapPreview
        guideImageSrc={guideImageSrc}
        mapLogoSrc={look.mapLogoSrc}
        scale={smallScale}
      />
    </PreviewRow>
  );
};

// the home page with its new picture, logo and text colour, and the map
// with its new logo
export const IntroImagePreviewPane = () => {
  const look = usePhoneLook();
  return (
    <PreviewRow note="文字為示意">
      <IntroPreview
        text="前情提要的文字會以這個顏色顯示。"
        choices={["開始"]}
        allowTextReply={false}
        scenarioName={getCurrentScenarioName()}
        look={look}
        scale={smallScale}
      />
      <MapPreview mapLogoSrc={look.mapLogoSrc} scale={smallScale} />
    </PreviewRow>
  );
};

// a popup after this action, in the colours it sets
export const ButtonStylePreviewPane = () => {
  const look = usePhoneLook();
  return (
    <PreviewRow note="之後的圖文視窗與首頁按鈕；文字為示意">
      <AlertPreview
        text="之後出現的按鈕會是這個顏色。"
        choices={["選項一", "選項二"]}
        allowTextReply={false}
        look={look}
        scale={smallScale}
      />
    </PreviewRow>
  );
};

export const PopupStylePreviewPane = () => {
  const look = usePhoneLook();
  return (
    <PreviewRow note="之後的提示視窗；文字為示意">
      <AlertPreview
        text="之後的提示視窗文字與面板會是這個顏色。"
        choices={["好"]}
        allowTextReply={false}
        look={look}
        scale={smallScale}
      />
    </PreviewRow>
  );
};

// the style file a map style record points at, read once per file
function useStyleFile(src) {
  const [state, setState] = React.useState({ src: null, style: null });
  React.useEffect(() => {
    if (!src) return undefined;
    let current = true;
    fetch(src)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((style) => current && setState({ src, style, failed: false }))
      .catch(() => current && setState({ src, style: null, failed: true }));
    return () => {
      current = false;
    };
  }, [src]);
  return state.src === src ? state : { style: null, failed: false };
}

export const MapStylePreviewPane = ({ formData }) => {
  const { data: record } = useGetOne(
    "mapStyles",
    { id: formData.mapStyle },
    { enabled: !!formData.mapStyle && !formData.satellite }
  );
  const src = !formData.satellite && record?.mapStyle?.src;
  const { style, failed } = useStyleFile(src || null);
  const colors = React.useMemo(() => style && mapColors(style), [style]);
  const look = usePhoneLook();
  const note = formData.satellite
    ? "衛星地圖為示意，實際是當地的空照圖"
    : failed
    ? "讀不到樣式檔，以 App 預設的地圖顯示"
    : !formData.mapStyle
    ? "還沒選樣式，以 App 預設的地圖顯示"
    : "只畫出道路、水域、公園與路名的顏色";
  return (
    <PreviewRow note={note}>
      <MapPreview
        colors={colors || undefined}
        satellite={!!formData.satellite}
        mapLogoSrc={look.mapLogoSrc}
        scale={smallScale}
      />
    </PreviewRow>
  );
};
