import * as React from "react";
import {
  SimpleForm as RaSimpleForm,
  ValidationError,
  useNotify,
} from "react-admin";
import { useFormState } from "react-hook-form";
import { describePath, findField } from "./fieldLabels";

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

// SimpleForm whose invalid-form notice names the fields to fix, and which
// asks before leaving the page with unsaved edits
const SimpleForm = ({ children, ...props }) => (
  <RaSimpleForm
    disableInvalidFormNotification
    warnWhenUnsavedChanges
    {...props}
  >
    <InvalidFormNotice />
    {children}
  </RaSimpleForm>
);

export default SimpleForm;
