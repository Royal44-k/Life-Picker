import test from 'node:test';import assert from 'node:assert/strict';
import {validateVideoInput} from '../server/video-render.mjs';import {frame,testPng} from './helpers/video-png.mjs';
test('video input keeps frame order and validates duration, PNG dimensions and optional motion area',()=>{
 const input=validateVideoInput({duration:15,frames:[frame([220,90,80],{x:90,y:300,w:600,h:400}),frame([40,110,180])]});
 assert.equal(input.duration,15);assert.equal(input.frames.length,2);assert.deepEqual(input.frames[0].photo,{x:90,y:300,w:600,h:400});assert.equal(input.frames[0].width,1080);assert.equal(input.frames[0].height,1440);assert.deepEqual(input.frames[0].bytes,testPng([220,90,80]));
 for(const bad of [{duration:14,frames:[frame()]},{duration:15,frames:[]},{duration:15,frames:Array.from({length:13},()=>frame())},{duration:15,frames:[{data:'https://example.com/a.png'}]},{duration:15,frames:[{data:'data:image/png;base64,'+testPng([1,2,3],80,60).toString('base64')}]},{duration:15,frames:[frame([1,2,3],{x:-1,y:20,w:10,h:10})]},{duration:15,frames:[{data:'data:image/png;base64,'+Buffer.from('not a png').toString('base64')}]}])assert.throws(()=>validateVideoInput(bad));
});
test('video input refuses inconsistent canvas sizes, excessive reading speed and truncated PNG',()=>{
 assert.throws(()=>validateVideoInput({duration:15,frames:Array.from({length:9},()=>frame())}),/时长/);
 assert.throws(()=>validateVideoInput({duration:15,frames:[frame(),{data:'data:image/png;base64,'+testPng([1,2,3],1080,1920).toString('base64')}]}),/尺寸/);
 const cut=testPng().subarray(0,50);assert.throws(()=>validateVideoInput({duration:15,frames:[{data:'data:image/png;base64,'+cut.toString('base64')}]}),/PNG/);
});
