import * as React from "react";

// Lists open a record when its row is clicked, so a control inside the row
// must keep its clicks to itself. react-admin's own buttons and its Confirm
// dialog already do; wrap anything else: a plain Button, a Link, an audio
// player, or a raw MUI Dialog (React bubbles clicks from a portal back to the
// row that opened it).
const stop = (event) => event.stopPropagation();

const StopRowClick = ({ children }) => <span onClick={stop}>{children}</span>;

export default StopRowClick;
