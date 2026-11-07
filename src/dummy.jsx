import * as React from "react";
import { Datagrid, List, TextField, Button, Link } from "react-admin";

const Title = () => <span>請先選擇目前劇本</span>;

// shown by every list until a scenario has been chosen to work on
const EmptyPage = () => (
  <div style={{ padding: 24 }}>
    <h2>還沒有選擇要編輯的劇本</h2>
    <p>
      到劇本列表，在想編輯的劇本上按「設定為目前劇本」，這一頁就會顯示它的內容。
    </p>
    <Button
      component={Link}
      to="/scenarios"
      label="前往劇本列表"
      variant="contained"
    />
  </div>
);

export const DummyList = () => (
  <List title={<Title />} empty={<EmptyPage />} actions={false}>
    <Datagrid rowClick={false} bulkActionButtons={false}>
      <TextField label="請先選擇目前劇本" source="name" />
    </Datagrid>
  </List>
);
