import {zipSync,strToU8,strFromU8} from 'fflate';
import {readCheckedZip} from '../core/checked-zip.ts';
import {validateSeries} from './model.ts';
import type {PersonalSeries} from './model.ts';
function check(values:unknown):PersonalSeries[]{if(!Array.isArray(values)||!values.length||values.length>50)throw new Error('系列备份需要 1～50 项。');const rows=values.map(validateSeries);if(rows.some(r=>r.revision<1)||new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('系列备份含有重复或未保存的定义。');return rows;}
export async function makeSeriesBundle(values:PersonalSeries[]):Promise<Blob>{const rows=check(values),bytes=strToU8(JSON.stringify({format:'shiye-series',version:1,series:rows}));if(bytes.length>400_000)throw new Error('系列备份过大。');return new Blob([zipSync({'manifest.json':bytes},{level:0}) as Uint8Array<ArrayBuffer>],{type:'application/zip'});}
export function readSeriesBundle(bytes:Uint8Array):PersonalSeries[]{const files=readCheckedZip(bytes,{maxBytes:500_000,maxEntry:400_000,maxFiles:1});if(!files['manifest.json'])throw new Error('缺少系列备份清单。');let value;try{value=JSON.parse(strFromU8(files['manifest.json']));}catch{throw new Error('系列备份清单损坏。');}if(value.format!=='shiye-series'||value.version!==1)throw new Error('不是受支持的系列备份。');return check(value.series);}
