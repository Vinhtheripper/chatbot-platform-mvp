import React from "react";
import IndexStatus from "../IndexStatus";
import { Inspection } from "../ConfigurationSteps";

export default function ReviewStep({
  form,
  selected,
  catalog,
  dirty,
  busy,
  patch,
  nested,
  routeChange,
  deleteRoute,
  upload,
  publish,
}) {
  return (
    <>
      <IndexStatus
        botId={selected.id}
        revision={selected.revision}
        dirty={dirty}
        busy={busy}
      />
      <Inspection
        key={`${selected.id}:${selected.revision}`}
        bot={selected}
        form={form}
        dirty={dirty}
        onPublish={publish}
        busy={busy}
      />
    </>
  );
}
