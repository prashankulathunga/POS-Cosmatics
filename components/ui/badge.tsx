import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
    {
        variants: {
            variant: {
                default: 'bg-transparent text-gray-600',
                secondary: 'bg-slate-100/15 text-slate-200',
                warning: 'bg-amber-50 text-amber-700',
                destructive: 'bg-rose-50 text-rose-700',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

export function Badge({
    className,
    variant,
    ...props
}: React.ComponentProps<'div'> & VariantProps<typeof badgeVariants>) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
