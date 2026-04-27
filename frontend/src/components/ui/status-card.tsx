import { type ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatusCardProps {
    action?: ReactNode;
    className?: string;
    description?: ReactNode;
    icon?: ReactNode;
    title: ReactNode;
}

export function StatusCard({ action, className, description, icon, title }: StatusCardProps) {
    return (
        <Card className={cn('panel-shell', className)}>
            <CardContent className="flex min-h-[18rem] flex-col items-center justify-center px-6 py-10 text-center">
                {icon && (
                    <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 text-slate-300">
                        {icon}
                    </div>
                )}
                <h3 className="text-xl font-semibold tracking-tight text-slate-50">{title}</h3>
                {description && <div className="mt-3 max-w-md text-sm leading-6 text-slate-400">{description}</div>}
                {action && <div className="mt-6">{action}</div>}
            </CardContent>
        </Card>
    );
}
