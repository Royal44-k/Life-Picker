export function studioUrl(base='http://localhost:5173'){const url=new URL(base);url.searchParams.set('view','studio');return url.toString();}
