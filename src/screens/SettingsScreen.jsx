import { SimpleScreen, Title } from '../ui/common';
import { c, cx } from '../ui/styles';

export function SettingsScreen({
  user,
  address,
  notificationSettings,
  notifications = [],
  onNotificationChange,
  onTestExpiryNotification,
  onLogin,
  onLogout,
  openPostcode,
  onDeleteAddress,
}) {
  if (!user) return <SimpleScreen title="설정" icon="⚙️" locked onLogin={onLogin} body="로그인 후 알림, 위치 정보를 관리할 수 있습니다." />;

  const notificationOn = notificationSettings.enabled;
  const selectedDays = notificationSettings.days || [];
  const allDays = [1, 3, 7];
  const allSelected = allDays.every((day) => selectedDays.includes(day));

  function toggleNotification() {
    onNotificationChange({ ...notificationSettings, enabled: !notificationOn });
  }

  function toggleDay(day) {
    const days = selectedDays.includes(day)
      ? selectedDays.filter((item) => item !== day)
      : [...selectedDays, day].sort((left, right) => left - right);
    onNotificationChange({ ...notificationSettings, days });
  }

  function toggleAllDays() {
    onNotificationChange({ ...notificationSettings, days: allSelected ? [] : allDays });
  }

  function toggleDiscountNotification() {
    onNotificationChange({ ...notificationSettings, discountEnabled: !notificationSettings.discountEnabled });
  }

  return (
    <div className={c.stack}>
      <Title kicker="설정" title="⚙️ 내 설정" />
      <div className={cx(c.card, 'grid grid-cols-[auto_1fr] items-center gap-3')}>
        <span className="grid h-14 w-14 place-items-center rounded-lg bg-emerald-50 text-3xl">{user.role === 'seller' ? '🏪' : '🧑‍🍳'}</span>
        <div>
          <strong className="text-lg text-slate-950">{user.name || user.userId}</strong>
          <p className="m-0 text-sm text-slate-500">{user.role === 'seller' ? '판매자 계정' : '소비자 계정'}</p>
        </div>
      </div>

      <div className={cx(c.card, 'grid gap-3')}>
        <button className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left" type="button" onClick={toggleNotification}>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-white text-2xl">🔔</span>
          <div>
            <strong className="text-slate-950">알림 설정</strong>
            <p className="m-0 text-sm text-slate-500">{notificationOn ? '알림을 받고 있습니다.' : '알림이 꺼져 있습니다.'}</p>
          </div>
          <span className={cx('h-7 w-12 rounded-full p-1 transition', notificationOn ? 'bg-emerald-600' : 'bg-slate-300')}>
            <span className={cx('block h-5 w-5 rounded-full bg-white transition', notificationOn && 'translate-x-5')} />
          </span>
        </button>

        {notificationOn && (
          <div className="grid gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <div>
              <strong className="text-sm text-emerald-950">소비기한 알림 시점</strong>
              <p className="m-0 mt-1 text-xs font-bold text-emerald-700">선택한 날짜 이내로 남은 식료품을 앱 실행 중 자동으로 알려줍니다.</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {allDays.map((day) => {
                const selected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    className={cx(
                      'h-11 rounded-lg border px-2 text-sm font-black active:scale-95',
                      selected ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-emerald-200 bg-white text-emerald-800',
                    )}
                    type="button"
                    onClick={() => toggleDay(day)}
                  >
                    {day}일 전
                  </button>
                );
              })}
              <button
                className={cx(
                  'h-11 rounded-lg border px-2 text-sm font-black active:scale-95',
                  allSelected ? 'border-slate-950 bg-slate-950 text-white' : 'border-emerald-200 bg-white text-emerald-800',
                )}
                type="button"
                onClick={toggleAllDays}
              >
                모두
              </button>
            </div>
            <button
              className="h-11 rounded-lg bg-slate-950 px-4 text-sm font-black text-white active:scale-95"
              type="button"
              onClick={onTestExpiryNotification}
            >
              푸시 알림 테스트
            </button>
            {user.role === 'consumer' && (
              <button
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-emerald-200 bg-white p-3 text-left"
                type="button"
                onClick={toggleDiscountNotification}
              >
                <span className="text-xl">🏷️</span>
                <span>
                  <strong className="block text-sm text-slate-950">할인 정보 알림</strong>
                  <span className="block text-xs font-bold text-slate-500">주변 판매자가 할인 정보를 등록하면 알려줍니다.</span>
                </span>
                <span className={cx('h-7 w-12 rounded-full p-1 transition', notificationSettings.discountEnabled ? 'bg-emerald-600' : 'bg-slate-300')}>
                  <span className={cx('block h-5 w-5 rounded-full bg-white transition', notificationSettings.discountEnabled && 'translate-x-5')} />
                </span>
              </button>
            )}
          </div>
        )}

        {notifications.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="m-0 text-xs font-black text-amber-700">최근 알림</p>
            {notifications.slice(0, 5).map((item) => (
              <div key={item.id} className="mt-2 rounded-lg bg-white/70 p-2">
                <p className="m-0 text-xs font-black text-amber-700">{item.type === 'expiry' ? '소비기한' : '할인'}</p>
                <p className="m-0 mt-1 text-sm font-bold text-amber-950">{item.body}</p>
              </div>
            ))}
          </div>
        )}

        <button className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left" type="button" onClick={openPostcode}>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-white text-2xl">📍</span>
          <div>
            <strong className="text-slate-950">위치 등록</strong>
            <p className="m-0 text-sm text-slate-500">{address ? '등록된 주소를 변경합니다.' : '주소 검색으로 내 위치를 등록합니다.'}</p>
          </div>
        </button>
        {address && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="m-0 text-xs font-black text-emerald-700">등록된 주소</p>
            <strong className="mt-1 block text-sm text-emerald-950">{address.address}</strong>
            {address.detailAddress && <p className="m-0 mt-1 text-xs font-bold text-emerald-900">상세주소 {address.detailAddress}</p>}
            <p className="m-0 mt-1 text-xs text-emerald-800">우편번호 {address.postcode}</p>
            {user.role === 'consumer' && (
              <button
                className="mt-3 h-10 w-full rounded-lg border border-rose-200 bg-white px-3 text-sm font-black text-rose-600 active:scale-95"
                type="button"
                onClick={onDeleteAddress}
              >
                위치 정보 제거
              </button>
            )}
            {user.role === 'seller' && (
              <p className="m-0 mt-3 text-xs font-bold text-emerald-800">판매자 계정은 사업장 위치가 필수라 삭제할 수 없고 변경만 가능합니다.</p>
            )}
          </div>
        )}
      </div>

      <button className="h-12 rounded-lg bg-slate-950 px-4 text-sm font-black text-white" type="button" onClick={onLogout}>로그아웃</button>
    </div>
  );
}
