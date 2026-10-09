export interface NarrativeDraft{opening:string;connections:{entryId:string;text:string}[];closing:string}
export function parseNarrativeDraft(value:unknown,ids:string[]):NarrativeDraft;
