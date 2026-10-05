import {validatePublication,emptyPublication} from '../src/series/model.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import {planStory} from '../src/studio/planner.ts';import {DEFAULT_OPTIONS} from '../src/core/layout.ts';import {validateStory,makeBundle,readBundle} from '../src/studio/backup.ts';
const series={id:'series-1',revision:2,name:'窗边札记',topic:'阅读与生活观察',tone:'温柔治愈'};
const publication={version:1,url:'https://www.xiaohongshu.com/explore/example',date:'2026-10-05',observedOn:'2026-10-06',metrics:{views:null,likes:0,favorites:12,comments:null},reflection:'保留自己真实的细节',nextIdea:'再写一篇声音观察',updatedAt:1};
const story=()=>({...planStory('## 自己的记录\n\n一个窗边的观察。',DEFAULT_OPTIONS,{target:0,cover:true,ending:'none'}),series,publication});
test('series and self-reported publication remain in a work backup without changing content or unknown counts',async()=>{const s=story(),blob=await makeBundle(s,async()=>undefined),restored=readBundle(new Uint8Array(await blob.arrayBuffer()));assert.deepEqual(restored.story.series,series);assert.deepEqual(restored.story.publication,publication);assert.equal(restored.story.source,s.source);assert.equal(restored.story.publication.metrics.views,null);assert.equal(restored.story.publication.metrics.likes,0);});
test('work rejects invalid series revisions and unsupported tone defaults',()=>{for(const invalid of [{...series,revision:0},{...series,name:''},{...series,tone:'execute script'},{...series,topic:'文'.repeat(1001)}])assert.throws(()=>validateStory({...story(),series:invalid}),/系列/);});
test('publication rejects unsafe links, impossible dates and invented unknown-number coercion',()=>{for(const invalid of [{...publication,url:'javascript:alert(1)'},{...publication,url:'https://user:password@example.com/'},{...publication,date:'2026-02-30'},{...publication,metrics:{...publication.metrics,views:-1}},{...publication,metrics:{...publication.metrics,likes:'未知'}},{...publication,reflection:'文'.repeat(3001)}])assert.throws(()=>validateStory({...story(),publication:invalid}),/发布|回看/);});

test('publication backup removes known login parameters without mutating the editing object',async()=>{const s=story();s.publication={...publication,url:'https://example.com/post?%78sec_token=PRIVATE_TOKEN&api_key=PRIVATE_KEY&item=3#auth_token=PRIVATE_FRAGMENT'};const blob=await makeBundle(s,async()=>undefined),restored=readBundle(new Uint8Array(await blob.arrayBuffer()));assert.equal(restored.story.publication.url,'https://example.com/post?item=3');assert.ok(s.publication.url.includes('PRIVATE_TOKEN'));});

test('publication links remove nested and malformed-neighbor encoded credential fragments',()=>{
 for(const url of ['https://example.com/#bad%ZZ&api_key%3DPRIVATE','https://example.com/?%2561ccess_token=PRIVATE&id=42','https://example.com/#refresh_token%253DPRIVATE'])assert.ok(!JSON.stringify(validatePublication({...emptyPublication(),url})).includes('PRIVATE'));
});
