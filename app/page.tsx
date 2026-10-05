"use client";

export default function Home() {

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 p-8">
      <main className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">Quản lý Diệp Gia</h1>
            <p className="mt-2 text-zinc-600">Chào mừng bạn quay trở lại.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
