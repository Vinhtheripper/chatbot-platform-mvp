import React from "react";
import { HandlerSettings } from "../AdvancedSettings";
import { FeatureSettings } from "../ConfigurationSteps";

export default function FeaturesStep({
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
      <HandlerSettings catalog={catalog} form={form} patch={patch} />
      <FeatureSettings form={form} patch={patch} nested={nested} />
    </>
  );
}
