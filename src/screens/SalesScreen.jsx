import { useState } from 'react';
import { c, cx } from '../ui/styles';
import { SimpleScreen, Title } from '../ui/common';

export function SalesScreen({ user, foods, sales, address, onLogin, onRequireAddress, onCreateSale, onDeleteSales }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedSaleIds, setSelectedSaleIds] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);

  if (!user) return <SimpleScreen title="할인" icon="🏷️" locked onLogin={onLogin} body="로그인 후 할인 정보를 확인할 수 있습니다." />;
  if (user.role !== 'seller' && !address) {
    return <SimpleScreen title="할인" icon="🏷️" body="할인 정보를 보려면 주소 등록이 필요합니다." actionLabel="주소 등록하기" onAction={onRequireAddress} />;
  }

  const isSeller = user.role === 'seller';

  function toggleSale(id) {
    setSelectedSaleIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function confirmDelete() {
    await onDeleteSales(selectedSaleIds);
    setSelectedSaleIds([]);
    setDeleteMode(false);
    setConfirmOpen(false);
  }

  return (
    <div className={c.stack}>
      <Title kicker="할인" title={isSeller ? '할인 정보 관리' : '주변 할인 정보'} />

      {!isSeller && address && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
          <p className="m-0 text-xs font-black text-emerald-700">검색 기준 지역</p>
          <strong className="mt-1 block text-sm text-emerald-950">{address.address}</strong>
          <p className="m-0 mt-1 text-xs font-bold text-emerald-800">같은 광역시 또는 시에 등록된 마트 할인만 보여줍니다.</p>
        </div>
      )}

      {isSeller && (
        <div className="grid grid-cols-2 gap-3">
          {deleteMode ? (
            <>
              <button className="h-12 rounded-lg bg-rose-600 px-3 text-sm font-black text-white shadow-sm" type="button" onClick={() => selectedSaleIds.length && setConfirmOpen(true)}>삭제 ({selectedSaleIds.length}개 선택)</button>
              <button className="h-12 rounded-lg border border-blue-300 bg-white px-3 text-sm font-black text-blue-700" type="button" onClick={() => { setDeleteMode(false); setSelectedSaleIds([]); }}>취소</button>
            </>
          ) : (
            <>
              <button className="h-12 rounded-lg bg-emerald-700 px-3 text-sm font-black text-white shadow-sm" type="button" onClick={() => setModalOpen(true)}>할인 정보 등록</button>
              <button className="h-12 rounded-lg bg-rose-600 px-3 text-sm font-black text-white shadow-sm" type="button" onClick={() => setDeleteMode(true)}>🗑️ 할인 정보 삭제</button>
            </>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-black text-slate-800">{isSeller ? '등록된 할인 정보' : '주변 마트 할인 정보'}</h2>
        <div className="grid gap-3">
          {sales.map((sale) => {
            const selected = selectedSaleIds.includes(sale.id);
            return (
              <button
                key={sale.id}
                type="button"
                className={cx(c.card, 'grid grid-cols-[auto_1fr_auto] items-center gap-3 text-left', deleteMode && selected && 'border-emerald-600 bg-emerald-50')}
                onClick={() => deleteMode ? toggleSale(sale.id) : setSelectedSale(sale)}
              >
                {deleteMode && <span className={cx('grid h-6 w-6 place-items-center rounded border text-sm font-black', selected ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-500 bg-white text-transparent')}>✓</span>}
                <div>
                  <strong className="text-slate-950">{sale.foodName}</strong>
                  {!isSeller && sale.marketName && <p className="m-0 mt-1 text-sm font-black text-emerald-700">{sale.marketName}</p>}
                  <p className="m-0 mt-2 text-sm text-slate-600">정가: {formatPrice(sale.originalPrice)}</p>
                  <p className="m-0 text-sm text-slate-600">할인 기간: {sale.startDate} ~ {sale.endDate}</p>
                  <p className="m-0 text-sm text-slate-600">재고: {sale.quantity}{sale.unit}</p>
                  {!isSeller && sale.marketAddress && <p className="m-0 mt-1 text-xs text-slate-500">{sale.marketAddress}</p>}
                </div>
                <div className="text-right">
                  <strong className="text-red-600">{formatPrice(sale.salePrice)}</strong>
                  <p className="m-0 mt-1 rounded-full bg-red-600 px-2 py-1 text-xs font-black text-white">{sale.discountRate}% 할인</p>
                </div>
              </button>
            );
          })}
          {!sales.length && <div className={`${c.card} text-sm font-bold text-slate-500`}>{isSeller ? '등록된 할인 정보가 없습니다.' : '현재 주소와 같은 지역의 마트 할인 정보가 없습니다.'}</div>}
        </div>
      </section>

      {modalOpen && <SaleFormModal foods={foods} sales={sales} onClose={() => setModalOpen(false)} onSubmit={async (payload) => { await onCreateSale(payload); setModalOpen(false); }} />}
      {selectedSale && <SaleDetailModal sale={selectedSale} isSeller={isSeller} onClose={() => setSelectedSale(null)} />}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-6">
          <div className="w-full max-w-[330px] rounded-lg bg-white p-6 shadow-2xl">
            <h2 className="m-0 text-xl font-black text-slate-950">정말 삭제하시겠습니까?</h2>
            <p className="mt-4 text-sm text-slate-600">선택한 {selectedSaleIds.length}개의 할인 정보가 삭제됩니다.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="h-10 rounded-lg px-4 text-sm font-black text-blue-600" type="button" onClick={() => setConfirmOpen(false)}>취소</button>
              <button className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-black text-white" type="button" onClick={confirmDelete}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaleFormModal({ foods, sales, onClose, onSubmit }) {
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const activeSaleFoodIds = new Set(sales.map((sale) => Number(sale.foodId)));
  const availableFoods = foods.filter((food) => !activeSaleFoodIds.has(Number(food.id)));

  function submit() {
    const original = Number(originalPrice);
    const sale = Number(salePrice);
    const today = new Date().toISOString().slice(0, 10);
    if (!selectedFoodId) return setError('할인 품목을 선택해 주세요.');
    if (!original || original <= 0) return setError('정가는 0보다 커야 합니다.');
    if (!sale || sale <= 0) return setError('할인가는 0보다 커야 합니다.');
    if (sale >= original) return setError('할인가는 정가보다 낮아야 합니다.');
    if (startDate < today) return setError('할인 시작일은 오늘 이후여야 합니다.');
    if (endDate < today) return setError('할인 종료일은 오늘 이후여야 합니다.');
    if (endDate < startDate) return setError('할인 종료일은 시작일 이후여야 합니다.');
    setError('');
    onSubmit({ foodId: Number(selectedFoodId), originalPrice: original, salePrice: sale, startDate, endDate });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <div className="max-h-[86vh] w-full max-w-[390px] overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
        <h2 className="mb-5 text-xl font-black text-slate-950">할인 정보 등록</h2>
        <div className="grid gap-4">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>}
          <section>
            <p className="mb-2 text-sm font-bold text-slate-700">할인 품목 선택</p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
              {availableFoods.map((food) => (
                <button key={food.id} type="button" className={cx('grid w-full grid-cols-[auto_1fr] items-center gap-3 p-3 text-left', String(food.id) === String(selectedFoodId) && 'bg-emerald-50')} onClick={() => setSelectedFoodId(food.id)}>
                  <span className={cx('grid h-5 w-5 place-items-center rounded border text-xs font-black', String(food.id) === String(selectedFoodId) ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-500 text-transparent')}>✓</span>
                  <span><strong>{food.itemName || food.name}</strong><p className="m-0 text-sm text-slate-500">{food.category} | 수량: {food.quantity}{food.unit}</p></span>
                </button>
              ))}
              {!availableFoods.length && (
                <div className="p-4 text-sm font-bold text-slate-500">
                  할인 등록 가능한 식료품이 없습니다. 이미 등록된 할인 정보를 삭제한 뒤 다시 등록해 주세요.
                </div>
              )}
            </div>
          </section>
          <Input label="정가" value={originalPrice} onChange={setOriginalPrice} hint="할인 전 원래 가격" />
          <Input label="할인가" value={salePrice} onChange={setSalePrice} hint="정가보다 낮아야 합니다" />
          <Input label="시작일" type="date" value={startDate} onChange={setStartDate} hint="할인 시작일" />
          <Input label="종료일" type="date" value={endDate} onChange={setEndDate} hint="할인 종료일" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="h-10 rounded-lg px-4 text-sm font-black text-blue-600" type="button" onClick={onClose}>취소</button>
          <button className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white disabled:bg-slate-300" type="button" disabled={!availableFoods.length} onClick={submit}>등록</button>
        </div>
      </div>
    </div>
  );
}

function SaleDetailModal({ sale, isSeller, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[370px] rounded-lg bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-black text-emerald-700">할인 상세</p>
            <h2 className="m-0 mt-1 text-2xl font-black text-slate-950">{sale.foodName}</h2>
          </div>
          <button className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-black text-slate-600" type="button" onClick={onClose}>닫기</button>
        </div>

        {!isSeller && (
          <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <p className="m-0 text-xs font-black text-emerald-700">판매처</p>
            <strong className="mt-1 block text-sm text-emerald-950">{sale.marketName || '마트'}</strong>
            {sale.marketAddress && <p className="m-0 mt-1 text-xs font-bold text-emerald-800">{sale.marketAddress}</p>}
          </div>
        )}

        <div className="mt-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
          <InfoRow label="정가" value={formatPrice(sale.originalPrice)} />
          <InfoRow label="할인가" value={formatPrice(sale.salePrice)} strong />
          <InfoRow label="할인율" value={`${sale.discountRate}% 할인`} strong />
          <InfoRow label="할인 기간" value={`${sale.startDate} ~ ${sale.endDate}`} />
          <InfoRow label="재고" value={`${sale.quantity}${sale.unit}`} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? 'font-black text-red-600' : 'text-slate-950'}>{value}</span>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', hint }) {
  return <label className="grid gap-1 text-sm font-bold text-slate-700">{label}<input className={c.input} type={type} value={value} onChange={(event) => onChange(event.target.value)} />{hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}</label>;
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString()}원`;
}
