import { Card, CardContent } from '@/components/ui/card';

export function StatCard({
    title,
    value,
    subtitle,
}: {
    title: string;
    value: string;
    subtitle: string;
}) {
    return (
        <Card className="bg-white p-4 last:bg-[linear-gradient(135deg,#ffffff,#f8b8bb40)]">
            <CardContent className="flex items-center justify-start">
                <div className="space-y-2  w-full">
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
                    <p className="text-sm text-slate-500">{subtitle}</p>
                </div>
            </CardContent>
        </Card>
    );
}
