import type {Story} from './model.ts';
import {hashText} from './planner.ts';
export function storyboardVersion(story:Story,photos=false){return hashText(JSON.stringify([story.id,story.source,story.settings,story.options,story.pages,photos]));}
