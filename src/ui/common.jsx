import { c } from './styles';

export function Title({ kicker, title }) {
  return <div><p className={c.kicker}>{kicker}</p><h1 className={c.title}>{title}</h1></div>;
}

export function Input({ label, value, onChange, type = 'text', readOnly = false }) {
  return (
    <label className={c.label}>
      {label}
      <input className={c.input} type={type} value={value} readOnly={readOnly} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}

export function SimpleScreen({ title, icon, body, locked, onLogin, actionLabel, onAction }) {
  return (
    <div className={c.stack}>
      <Title kicker={title} title={`${icon} ${title}`} />
      <div className={`${c.card} grid justify-items-start gap-2`}>
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-2xl">{locked ? '🔐' : icon}</span>
        <strong>{locked ? '로그인이 필요합니다' : title}</strong>
        <p className="m-0 text-sm text-slate-500">{body}</p>
        {locked && <button className={c.primary} type="button" onClick={onLogin}>로그인하기</button>}
        {actionLabel && <button className={c.primary} type="button" onClick={onAction}>{actionLabel}</button>}
      </div>
    </div>
  );
}
