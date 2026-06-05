import { c, cx } from './styles';

export function AppHeader({ user, onLogin }) {
  return (
    <header className={c.top}>
      <div className="flex items-center gap-2 text-slate-950">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-xl">🧊</span>
        <strong>Food Manager</strong>
      </div>
      {!user && <button className={c.topBtn} type="button" onClick={onLogin}>로그인</button>}
    </header>
  );
}

export function BottomNavigation({ items, activeScreen, onSelect }) {
  return (
    <nav className={c.nav}>
      {items.map(([id, label, icon]) => (
        <button
          key={id}
          type="button"
          className={cx('grid h-14 place-items-center gap-0.5 rounded-lg text-xs font-black text-slate-500', activeScreen === id && 'bg-emerald-50 text-emerald-800')}
          onClick={() => onSelect(id)}
        >
          <span className="text-xl">{icon}</span>
          {label}
        </button>
      ))}
    </nav>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-white/70 p-6 backdrop-blur-sm">
      <div className="grid w-full max-w-[280px] justify-items-center gap-3 rounded-lg border border-emerald-100 bg-white p-6 text-center shadow-2xl">
        <span className="grid h-12 w-12 animate-pulse place-items-center rounded-lg bg-emerald-50 text-2xl">🧊</span>
        <strong className="text-slate-950">불러오는 중</strong>
        <p className="m-0 text-sm font-bold text-slate-500">DB와 레시피 정보를 확인하고 있습니다.</p>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = '확인',
  confirmClass = 'bg-rose-600',
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-6">
      <div className="w-full max-w-[330px] rounded-lg bg-white p-6 shadow-2xl">
        <h2 className="m-0 text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-4 text-sm text-slate-600">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="h-10 rounded-lg px-4 text-sm font-black text-slate-600" type="button" onClick={onCancel}>취소</button>
          <button className={cx('h-10 rounded-lg px-4 text-sm font-black text-white', confirmClass)} type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
