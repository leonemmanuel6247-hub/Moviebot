// Transforme les styles clairs existants sans toucher à la géométrie validée.
const colors: Record<string,string> = {
 '#fff':'#171D2A','#ffffff':'#111723','#f7f9fd':'#101622','#f8fafd':'#1A2331','#f3f7ff':'#1B2B46','#edf4ff':'#1C2D48','#edf3ff':'#233A5D','#e9f1ff':'#243C61','#e9f0ff':'#243C61','#eaf1ff':'#203658','#eaf5ff':'#203658','#f1efff':'#293351',
 '#192b4c':'#F0F5FF','#1c2d4b':'#F0F5FF','#142849':'#F0F5FF','#2a3f60':'#E6EEFC','#304564':'#E6EEFC','#354b6e':'#DAE5F7','#344e77':'#DAE5F7','#465a77':'#CAD8EA','#4a5d79':'#CAD8EA','#53647f':'#C1CEE1','#71829b':'#B7C5D9','#8190a6':'#AEBED3','#8a9ab0':'#AEBED3','#8c9aaf':'#AEBED3','#96a5b9':'#AEBED3','#98a6ba':'#AABAD0','#9aa9bd':'#AABAD0',
 '#253a5a':'#E6EEFC','#3f5473':'#D2E1F5','#354b6c':'#D2E1F5','#52709b':'#B9CDEA','#3669ca':'#A8C4FF','#f1f6ff':'#1B2B46','#fafcff':'#1C293B','#fbfcff':'#182435','#dbe8ff':'#263D5E','#e8eef7':'#303C50','#ebf1fb':'#303C50','#dde7f5':'#34435A','#edf1f6':'#303C50','#eef2f8':'#303C50',
 '#e9eef6':'#303C50','#e8eef6':'#303C50','#e9eef5':'#303C50','#e7edf6':'#303C50','#e7edf5':'#303C50','#e2eaf5':'#35445B','#dbe5f2':'#35445B','#edf1f7':'#303C50','#f0f3f8':'#303C50',
};
export function darkenStyles<T extends Record<string, any>>(styles:T):T {
 const out:Record<string,any>={};
 for(const [key,value] of Object.entries(styles)) {
  if(!value || typeof value!=='object') {out[key]=value;continue;}
  const item:Record<string,any>={};
  for(const [prop,v] of Object.entries(value)) item[prop]=typeof v==='string' ? ((prop==='color' && (v.toLowerCase()==='#fff' || v.toLowerCase()==='#ffffff')) ? v : (colors[v.toLowerCase()] || v)) : v;
  out[key]=item;
 }
 return out as T;
}
