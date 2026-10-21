import React from "react";
import GeneralStep from "./GeneralStep";
import ModelStep from "./ModelStep";
import RoutesStep from "./RoutesStep";
import DesignStep from "./DesignStep";
import KnowledgeStep from "./KnowledgeStep";
import RulesStep from "./RulesStep";
import FeaturesStep from "./FeaturesStep";
import ReviewStep from "./ReviewStep";

const steps = {
  general: GeneralStep,
  model: ModelStep,
  routes: RoutesStep,
  design: DesignStep,
  knowledge: KnowledgeStep,
  rules: RulesStep,
  features: FeaturesStep,
  review: ReviewStep,
};
export default function ConfigEditor({ tab, ...props }) {
  const Step = steps[tab];
  return <Step {...props} />;
}
