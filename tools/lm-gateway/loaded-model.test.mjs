import test from 'node:test';
import assert from 'node:assert/strict';
import {loadedLanguageModels,selectLoadedModel,modelSelection,FALLBACK_MODEL} from './loaded-model.mjs';
const model=(key,ids=[],type='llm')=>({key,type,loaded_instances:ids.map(id=>({id}))});
test('uses the loaded instance ID, excluding unloaded and embedding models',()=>{
  const inventory={models:[model('old-model'),model('new-model',['custom-instance']),model('embedding',['embed-instance'],'embedding')]};
  assert.equal(selectLoadedModel(inventory),'custom-instance');
  assert.deepEqual(loadedLanguageModels(inventory).map(m=>m.id),['custom-instance']);
});
test('re-evaluates inventory after a model switch without sticky selection',()=>{
  assert.equal(selectLoadedModel({models:[model('a',['a']),model('b')]}),'a');
  assert.equal(selectLoadedModel({models:[model('a'),model('b',['b'])]}),'b');
});
test('does not pick an unloaded model when none is loaded',()=>{
  assert.throws(()=>selectLoadedModel({models:[model('downloaded')]}),e=>e.status===503&&e.code==='no_loaded_model');
});
test('requires an unambiguous selection for multiple models or instances',()=>{
  for(const models of [[model('a',['a']),model('b',['b'])],[model('a',['a-1','a-2'])]]){
    assert.throws(()=>selectLoadedModel({models}),e=>e.status===409&&e.code==='multiple_loaded_models');
  }
});
test('rejects malformed inventory instead of guessing a model',()=>{
  assert.throws(()=>loadedLanguageModels({data:[]}));
});
test('loads only the fixed Devstral default when no LLM is loaded',()=>{
  assert.deepEqual(modelSelection({models:[model('other'),model(FALLBACK_MODEL)]}),{id:FALLBACK_MODEL,needsLoad:true});
});
test('an already loaded different model takes precedence over default',()=>{
  assert.deepEqual(modelSelection({models:[model('other',['other-instance']),model(FALLBACK_MODEL)]}),{id:'other-instance',needsLoad:false});
});
test('missing default never falls back to an arbitrary downloaded model',()=>{
  assert.throws(()=>modelSelection({models:[model('other')]}),e=>e.code==='default_model_unavailable');
});
test('multiple loaded models remain ambiguous even with the default installed',()=>{
  assert.throws(()=>modelSelection({models:[model('a',['a']),model('b',['b']),model(FALLBACK_MODEL)]}),e=>e.code==='multiple_loaded_models');
});

test('selects an explicit loaded instance with several loaded models',()=>{
  const inventory={models:[model('a',['a-instance']),model('b',['b-instance'])]};
  assert.equal(selectLoadedModel(inventory,'b-instance',true),'b-instance');
  assert.equal(selectLoadedModel(inventory,'b',true),'b-instance');
  assert.deepEqual(modelSelection(inventory,'b-instance',true),{id:'b-instance',needsLoad:false});
});

test('strict selections never switch silently to another model or trigger auto loading',()=>{
  for(const inventory of [{models:[model('b',['b'])]},{models:[model(FALLBACK_MODEL)]}]){
    assert.throws(()=>modelSelection(inventory,'a',true),e=>e.code==='requested_model_not_loaded');
  }
});

test('legacy single-model requests retain compatibility with old caller model aliases',()=>{
  assert.equal(selectLoadedModel({models:[model('actual',['instance'])]},'old-alias'),'instance');
});

test('a model key with multiple loaded instances is not guessed',()=>{
  assert.throws(()=>selectLoadedModel({models:[model('a',['a-1','a-2'])]},'a',true),e=>e.code==='multiple_loaded_models');
});
