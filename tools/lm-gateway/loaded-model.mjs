export function loadedLanguageModels(inventory) {
  if (!inventory || !Array.isArray(inventory.models)) throw Error('Invalid LM Studio inventory');
  const instances = new Map();
  for (const model of inventory.models) {
    if (model.type !== 'llm' || !Array.isArray(model.loaded_instances)) continue;
    for (const instance of model.loaded_instances) {
      if (typeof instance.id === 'string' && instance.id.trim()) {
        instances.set(instance.id, { id: instance.id, name: model.display_name || model.key || instance.id, key: model.key });
      }
    }
  }
  return [...instances.values()];
}

export function selectLoadedModel(inventory, requested, strict = false) {
  const models = loadedLanguageModels(inventory);
  if (requested) {
    const matches = models.filter(model => model.id === requested || model.key === requested);
    if (matches.length === 1) return matches[0].id;
    if (!matches.length && (strict || models.length > 1)) {
      const error = new Error('Requested language model is not loaded in LM Studio');
      error.status = 409; error.code = 'requested_model_not_loaded'; throw error;
    }
  }
  if (models.length !== 1) {
    const error = new Error(models.length ? 'Load exactly one language model in LM Studio' : 'No language model loaded in LM Studio');
    error.status = models.length ? 409 : 503;
    error.code = models.length ? 'multiple_loaded_models' : 'no_loaded_model';
    throw error;
  }
  return models[0].id;
}

export const FALLBACK_MODEL = 'devstral-small-2-24b-instruct-2512';

export function modelSelection(inventory, requested, strict = false) {
  const loaded = loadedLanguageModels(inventory);
  if (loaded.length || (strict && requested)) return { id: selectLoadedModel(inventory, requested, strict), needsLoad: false };
  if (inventory.models.some(model => model.type === 'llm' && model.key === FALLBACK_MODEL)) {
    return { id: FALLBACK_MODEL, needsLoad: true };
  }
  const error = new Error('Default Devstral model is not installed in LM Studio');
  error.status = 503; error.code = 'default_model_unavailable'; throw error;
}
