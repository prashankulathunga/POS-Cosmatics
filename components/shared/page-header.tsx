import { CardDescription, CardTitle } from '@/components/ui/card';

export function PageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description: string;
    actions?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-center lg:justify-between bg-[linear-gradient(245deg,#ffffff,#f8b8bb15)] p-4 rounded-md mt-2">
            <div className="space-y-0.5 flex justify-between items-center w-full flex-row-reverse">
                <CardTitle className="text-2xl"><span className='text-[#ecafb2] pr-3'>{title}</span></CardTitle>
                <CardDescription><span className='text-slate-400/80'>{description}</span></CardDescription>
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
    );
}
