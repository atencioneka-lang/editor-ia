import assert from 'node:assert/strict';
import {DEFAULT,parseInstruction,normalize,dimensions} from '../src/engine.ts';
import {couldNeedNeural} from '../src/ai-upscale.ts';

const light=parseInstruction('Aumenta ligeramente la luz y el contraste',DEFAULT);
assert.equal(light.changed,true);
assert.ok(light.next.brightness>0 && light.next.contrast>0);
assert.equal(couldNeedNeural('Mejora la calidad con IA'),true);
assert.equal(couldNeedNeural('Restaura esta imagen a 4K'),true);
assert.equal(couldNeedNeural('Aumenta la luz'),false);
assert.equal(normalize({...DEFAULT,brightness:600}).brightness,100);
assert.deepEqual(dimensions(100,200,90),[200,100]);
console.log('Pruebas de lógica básica: OK');
