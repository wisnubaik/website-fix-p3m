export default function PageLoadingSkeleton() {
    return (
        <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Memuat konten…</span>

            {/* Hero skeleton */}
            <div className="bg-[var(--color-blackhole)] py-16 md:py-24 lg:py-28">
                <div className="max-w-[1280px] mx-auto px-5 md:px-14">
                    <div className="h-4 w-40 bg-white/10 rounded-full animate-pulse mb-6" />
                    <div className="h-12 md:h-16 w-3/4 max-w-[700px] bg-white/10 rounded-none animate-pulse mb-4" />
                    <div className="h-5 w-full max-w-[500px] bg-white/10 rounded-none animate-pulse" />
                </div>
            </div>

            {/* Content skeleton */}
            <div className="max-w-[1280px] mx-auto px-5 md:px-14 py-12 md:py-16">
                <div className="h-[220px] bg-[var(--color-whisper-white)] border border-[var(--color-outline-gray)] mb-10 animate-pulse" />
                <div className="h-16 bg-[var(--color-whisper-white)] border border-[var(--color-outline-gray)] mb-8 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-24 bg-[var(--color-whisper-white)] border border-[var(--color-outline-gray)] animate-pulse"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
