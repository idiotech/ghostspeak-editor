function getRecordField(record, field) {
  if (record) {
    return record[field];
  } else {
    console.trace();
    alert("連線逾期。");
    window.location.reload();
    return null;
  }
}

export { getRecordField };

// Fields the list views add to records for display only (see App.jsx); they
// must not be written back to Firestore.
const displayOnlyFields = ["rowIndex", "sorted", "children"];

function withoutDisplayFields(data) {
  const copy = { ...data };
  displayOnlyFields.forEach((field) => delete copy[field]);
  return copy;
}

export { withoutDisplayFields };

// Firestore refuses undefined ("Unsupported field value: undefined"), and
// react-hook-form submits every input the record had no value for as
// undefined, so a form with an untouched optional field could not be saved.
// An absent field means the same thing to Firestore, so drop them. Only plain
// objects are walked: a File, Date or Timestamp has to reach Firebase intact.
function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function withoutUndefined(value) {
  if (Array.isArray(value))
    return value.filter((v) => v !== undefined).map(withoutUndefined);
  if (isPlainObject(value))
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, withoutUndefined(v)])
    );
  return value;
}

export { withoutUndefined };
