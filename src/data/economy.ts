import { CROPS } from "./crops";
import { PROCESSING_MACHINES, getProcessingRecipeById } from "./processing";

/** 公开经济说明层：全部字段均由静态配置推导，不参与存档序列化。 */
export const getCropEconomyProfile = (cropId: string) => {
  const crop = CROPS.find((entry) => entry.id === cropId);
  if (!crop) return null;
  return { role: crop.economyRole ?? "时令田作", stage: crop.supplyStage ?? "fresh", uses: crop.uses ?? [] };
};

export const getProcessingEconomyProfile = (recipeId: string) => {
  const recipe = getProcessingRecipeById(recipeId);
  if (!recipe) return null;
  const machine = PROCESSING_MACHINES.find((entry) => entry.id === recipe.machineType);
  return { stage: recipe.processStage ?? "transform", role: recipe.supplyRole ?? "常规百工作序", machineName: machine?.name ?? recipe.machineType };
};
