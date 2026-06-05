import heroImage from '../assets/food-manager-hero.png';

export function WelcomeScreen({ onLogin }) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[430px] content-between overflow-hidden bg-white shadow-2xl shadow-slate-300">
      <section className="grid gap-6 px-6 pt-12">
        <div className="grid gap-2">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-100 text-2xl">🧊</span>
          <h1 className="m-0 text-4xl font-black leading-tight text-slate-950">Food Manager</h1>
          <p className="m-0 text-base font-bold leading-relaxed text-slate-600">
            식료품, 할인, 레시피를 한 곳에서 관리하세요.
          </p>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <img className="mx-auto block w-full max-w-[310px]" src={heroImage} alt="식료품 관리 이미지" />
        </div>
      </section>

      <section className="grid gap-3 border-t border-slate-100 bg-slate-50 px-6 pb-8 pt-5">
        <button
          className="h-12 rounded-lg bg-slate-950 px-5 text-base font-black text-white shadow-lg shadow-slate-200 active:scale-95"
          type="button"
          onClick={onLogin}
        >
          로그인
        </button>
      </section>
    </main>
  );
}
