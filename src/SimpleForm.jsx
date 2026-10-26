import * as React from "react";
import {
  SimpleForm as RaSimpleForm,
  ValidationError,
  useNotify,
} from "react-admin";
import { useFormState } from "react-hook-form";

// the label shown beside the input for this field path, read from the form
// itself so every input is covered without a separate list of labels
function findField(path) {
  return (
    document.querySelector(`[name="${path}"]`) ||
    document.getElementsByClassName("ra-input-" + path)[0] ||
    null
  );
}

function labelOf(element) {
  const control = element?.closest(".MuiFormControl-root");
  const label = control?.querySelector("label, legend");
  return label ? label.textContent.replace(/\s*\*\s*$/, "").trim() : "";
}

// "前一步 第1項的「文字」" for prevs.0.userReply, "「名稱」" for name
function describePath(path) {
  const element = findField(path);
  const own = labelOf(element) || path;
  const parts = path.split(".");
  const index = parts.findIndex((p) => /^\d+$/.test(p));
  if (index > 0) {
    const listPath = parts.slice(0, index).join(".");
    const list = document
      .getElementsByClassName("ra-input-" + listPath)[0]
      ?.querySelector(".RaArrayInput-label")
      ?.textContent.trim();
    if (list) return `${list} 第${Number(parts[index]) + 1}項的「${own}」`;
  }
  return `「${own}」`;
}

// react-hook-form nests errors like the form data; a leaf has a message
function flattenErrors(errors, prefix = "") {
  return Object.entries(errors || {}).flatMap(([key, value]) => {
    if (!value || typeof value !== "object") return [];
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value.message === "string" || value.type)
      return [{ path, message: value.message }];
    return flattenErrors(value, path);
  });
}

// On an invalid submit, says which fields are wrong and why, and brings the
// first one into view, instead of react-admin's generic notice.
const InvalidFormNotice = () => {
  const { submitCount, errors } = useFormState();
  const notify = useNotify();
  const seen = React.useRef(submitCount);
  React.useEffect(() => {
    if (submitCount === seen.current) return;
    seen.current = submitCount;
    const problems = flattenErrors(errors);
    if (problems.length === 0) return;
    // validators store their message in react-admin's own encoding, which
    // ValidationError translates
    notify(
      <div>
        還不能儲存，請修正：
        <ul style={{ margin: 0, paddingLeft: "1.5em" }}>
          {problems.map(({ path, message }) => (
            <li key={path}>
              {describePath(path)}
              <ValidationError error={message || "ra.validation.required"} />
            </li>
          ))}
        </ul>
      </div>,
      { type: "warning", autoHideDuration: 8000 }
    );
    findField(problems[0].path)?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [submitCount, errors, notify]);
  return null;
};

// SimpleForm whose invalid-form notice names the fields to fix
const SimpleForm = ({ children, ...props }) => (
  <RaSimpleForm disableInvalidFormNotification {...props}>
    <InvalidFormNotice />
    {children}
  </RaSimpleForm>
);

export default SimpleForm;
