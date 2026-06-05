export const c = {
  app: 'relative mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-slate-50 pb-24 shadow-2xl shadow-slate-300',
  top: 'sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur',
  topBtn: 'h-9 rounded-lg bg-slate-950 px-3 text-sm font-black text-white',
  content: 'px-4 py-4',
  toast: 'mx-4 mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900',
  stack: 'grid gap-4',
  kicker: 'm-0 text-xs font-black uppercase tracking-[0.14em] text-emerald-700',
  title: 'm-0 mt-1 text-2xl font-black leading-tight text-slate-950',
  card: 'rounded-lg border border-slate-200 bg-white p-4 shadow-sm',
  label: 'grid gap-1 text-sm font-bold text-slate-700',
  input: 'h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100',
  primary: 'mt-1 h-12 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white shadow-lg shadow-emerald-100 active:scale-95',
  secondary: 'h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 active:scale-95',
  row: 'grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm',
  nav: 'fixed bottom-0 left-1/2 z-30 grid w-full max-w-[430px] -translate-x-1/2 grid-flow-col border-t border-slate-200 bg-white px-2 pb-3 pt-2',
};

export function cx(...items) {
  return items.filter(Boolean).join(' ');
}
