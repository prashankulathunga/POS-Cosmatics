function LoadingCard() {
    return <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />;
}

export default function DashboardLoading() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="h-8 w-48 animate-pulse rounded-xl bg-slate-200/70" />
                <div className="h-5 w-80 animate-pulse rounded-xl bg-slate-200/60" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
                <div className="h-[360px] animate-pulse rounded-3xl bg-slate-200/70" />
                <div className="h-[360px] animate-pulse rounded-3xl bg-slate-200/60" />
            </div>
        </div>
    );
}
