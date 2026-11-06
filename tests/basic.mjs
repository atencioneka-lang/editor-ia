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

import {defaultProtections,buildEditPrompt} from '../src/edit-plan.ts';
const defaultClothes=defaultProtections('clothes');
assert.equal(defaultClothes.face,true);
assert.equal(defaultClothes.body,true);
assert.equal(defaultClothes.clothes,false);
const defaultPose=defaultProtections('pose');
assert.equal(defaultPose.pose,false);
const specific=buildEditPrompt('clothes','Cambiar chaqueta a azul',defaultClothes,true);
assert.ok(specific.includes('Cambiar chaqueta a azul'));
assert.ok(specific.includes('máscara PNG'));
assert.ok(specific.includes('Conserva el rostro'));
assert.ok(!specific.includes('Conserva exactamente las prendas'));
console.log('Pruebas de instrucciones y preservación: OK');
