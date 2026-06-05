import { Input, Title } from '../ui/common';
import { c } from '../ui/styles';

export function AuthScreen({ authMode, setAuthMode, authForm, setAuthForm, login, signup, openPostcode }) {
  const isSignupChoice = authMode === 'signup';
  const isSignup = authMode === 'consumer' || authMode === 'seller';
  const isSeller = authMode === 'seller';

  return (
    <form className={c.stack} onSubmit={login}>
      <Title kicker={authMode === 'login' ? '로그인' : '회원가입'} title={authMode === 'login' ? '내 식료품 관리 시작하기' : isSignupChoice ? '가입 유형 선택' : isSeller ? '판매자 정보 입력' : '소비자 정보 입력'} />
      {authMode !== 'login' && <button className="h-10 justify-self-start rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-600" type="button" onClick={() => setAuthMode('login')}>로그인으로 돌아가기</button>}
      {isSignupChoice && (
        <div className="grid gap-3">
          <SignupChoice icon="🧑‍🍳" title="소비자로 가입" body="식료품, 할인, 레시피를 이용합니다." onClick={() => setAuthMode('consumer')} />
          <SignupChoice icon="🏪" title="판매자로 가입" body="사업장 주소와 판매자 정보를 등록합니다." onClick={() => setAuthMode('seller')} />
        </div>
      )}
      {!isSignupChoice && (
        <div className={`${c.card} grid gap-3`}>
          <Input label="아이디" value={authForm.userId} onChange={(value) => setAuthForm({ ...authForm, userId: value })} />
          <Input label="비밀번호" type="password" value={authForm.password} onChange={(value) => setAuthForm({ ...authForm, password: value })} />
          {isSignup && <Input label="이름" value={authForm.name} onChange={(value) => setAuthForm({ ...authForm, name: value })} />}
          {isSeller && (
            <>
              <Input label="상호명" value={authForm.businessName} onChange={(value) => setAuthForm({ ...authForm, businessName: value })} />
              <Input label="사업자 이름" value={authForm.businessOwnerName} onChange={(value) => setAuthForm({ ...authForm, businessOwnerName: value })} />
              <Input label="사업자번호" value={authForm.businessNumber} onChange={(value) => setAuthForm({ ...authForm, businessNumber: formatBusinessNumber(value) })} />
              <p className="-mt-2 m-0 text-xs font-bold text-slate-500">숫자 10자리 기준으로 형식을 확인합니다.</p>
              <label className={c.label}>사업장 카테고리<select className={c.input} value={authForm.businessCategory} onChange={(event) => setAuthForm({ ...authForm, businessCategory: event.target.value })}><option value="마트">마트</option><option value="편의점">편의점</option></select></label>
              <div className="grid grid-cols-[1fr_auto] items-end gap-2"><Input label="우편번호" value={authForm.postcode} readOnly /><button className="h-11 rounded-lg bg-slate-950 px-4 text-sm font-black text-white" type="button" onClick={openPostcode}>검색</button></div>
              <Input label="주소" value={authForm.address} onChange={(value) => setAuthForm({ ...authForm, address: value })} />
              <Input label="상세주소" value={authForm.detailAddress} onChange={(value) => setAuthForm({ ...authForm, detailAddress: value })} />
            </>
          )}
          {authMode === 'login' ? (
            <>
              <button className={c.primary} type="submit">로그인</button>
              <button className={c.secondary} type="button" onClick={() => setAuthMode('signup')}>회원가입</button>
            </>
          ) : (
            <button className={c.primary} type="button" onClick={() => signup(authMode)}>가입하기</button>
          )}
        </div>
      )}
    </form>
  );
}

function SignupChoice({ icon, title, body, onClick }) {
  return <button className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm active:scale-95" type="button" onClick={onClick}><span className="row-span-2 grid h-14 w-14 place-items-center rounded-lg bg-emerald-50 text-3xl">{icon}</span><strong className="text-lg text-slate-950">{title}</strong><p className="m-0 text-sm text-slate-500">{body}</p></button>;
}

function formatBusinessNumber(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}
