import { c } from '../ui/styles';

export function PostcodeModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[390px] overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <strong>주소 검색</strong>
          <button className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-bold" type="button" onClick={onClose}>닫기</button>
        </div>
        <div id="postcode-layer" className="h-[28rem] w-full" />
      </div>
    </div>
  );
}

export function AddressNoticeModal({ open, onClose, onContinue }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-6">
      <div className="w-full max-w-[340px] rounded-lg bg-white p-6 shadow-2xl">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-50 text-2xl">📍</span>
        <h2 className="m-0 mt-4 text-xl font-black text-slate-950">주소 등록이 필요합니다</h2>
        <p className="mt-3 text-sm font-bold leading-relaxed text-slate-600">
          주변 할인 정보를 보여주기 위해 먼저 주소를 등록합니다. 다음 화면에서 카카오 우편번호 검색으로 주소를 선택해 주세요.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-600" type="button" onClick={onClose}>나중에</button>
          <button className="h-11 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white" type="button" onClick={onContinue}>주소 등록</button>
        </div>
      </div>
    </div>
  );
}

export function DetailAddressModal({
  open,
  address,
  detailAddress,
  onDetailAddressChange,
  onSave,
}) {
  if (!open || !address) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-6">
      <div className="w-full max-w-[340px] rounded-lg bg-white p-6 shadow-2xl">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-50 text-2xl">📍</span>
        <h2 className="m-0 mt-4 text-xl font-black text-slate-950">상세주소 입력</h2>
        <p className="mt-3 text-sm font-bold leading-relaxed text-slate-600">{address.address}</p>
        <label className="mt-4 grid gap-1 text-sm font-bold text-slate-700">
          상세주소
          <input
            className={c.input}
            placeholder="예: 101동 1203호 또는 1층"
            value={detailAddress}
            onChange={(event) => onDetailAddressChange(event.target.value)}
          />
        </label>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-600" type="button" onClick={onSave}>건너뛰기</button>
          <button className="h-11 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white" type="button" onClick={onSave}>저장</button>
        </div>
      </div>
    </div>
  );
}
