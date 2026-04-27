import { ExternalLink, HeartPulse, RefreshCw, ShieldCheck, SquareArrowOutUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

type IntegrationInfo = {
    name: string;
    url: string;
};

const UptimeKuma = () => {
    const [iframeKey, setIframeKey] = useState(0);
    const [integration, setIntegration] = useState<IntegrationInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadIntegration = async () => {
            try {
                const response = await fetch('/api/v1/integrations/uptime-kuma/info', {
                    credentials: 'include',
                });
                const data = (await response.json()) as IntegrationInfo;
                setIntegration(data);
            } finally {
                setIsLoading(false);
            }
        };

        loadIntegration();
    }, []);

    const iframeUrl = integration?.url || 'http://127.0.0.1:3001';

    return (
        <>
            <header className="sticky top-0 z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b border-slate-800/80 bg-slate-950/72 backdrop-blur-xl">
                <div className="flex w-full items-center justify-between gap-3 px-5">
                    <div className="flex items-center gap-3">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            className="h-5"
                            orientation="vertical"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="gap-2">
                                    <div className="bg-primary/15 text-primary flex size-8 items-center justify-center rounded-lg">
                                        <HeartPulse className="size-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.18em]">
                                            Monitoring
                                        </span>
                                        <BreadcrumbPage className="text-base font-semibold tracking-tight">
                                            Uptime Kuma
                                        </BreadcrumbPage>
                                    </div>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setIframeKey((value) => value + 1)}
                            size="sm"
                            variant="outline"
                        >
                            <RefreshCw />
                            Refresh
                        </Button>
                        <Button
                            asChild
                            size="sm"
                        >
                            <a
                                href={iframeUrl}
                                rel="noreferrer"
                                target="_blank"
                            >
                                <SquareArrowOutUpRight />
                                Open
                            </a>
                        </Button>
                    </div>
                </div>
            </header>

            <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl flex-col gap-4 p-4">
                <Card className="panel-shell border-slate-800/80 bg-slate-950/82">
                    <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                <ShieldCheck className="size-3.5 text-emerald-400" />
                                Monitoring Suite
                            </div>
                            <div className="text-xl font-semibold tracking-tight text-slate-50">
                                Monitoring integrated into Santatra App
                            </div>
                            <div className="max-w-3xl text-sm leading-6 text-slate-400">
                                A native monitoring area with direct access to checks, notifications and status pages, without leaving the main workspace.
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Endpoint</div>
                            <div className="mt-1 max-w-[22rem] truncate font-mono text-xs text-slate-300">{iframeUrl}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="panel-shell flex flex-1 flex-col overflow-hidden border-slate-800/80 bg-slate-950/84">
                    <CardHeader className="border-b border-slate-800/80 pb-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-slate-50">Uptime Workspace</CardTitle>
                                <CardDescription>
                                    {isLoading
                                        ? 'Loading integration settings...'
                                        : 'The monitoring console is embedded below and stays available in the same application shell.'}
                                </CardDescription>
                            </div>
                            <Button
                                asChild
                                size="sm"
                                variant="ghost"
                            >
                                <a
                                    href={iframeUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    <ExternalLink />
                                    Launch Separate View
                                </a>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 p-0">
                        {!isLoading && (
                            <div className="flex flex-1 flex-col">
                                <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/70 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/15 text-primary flex size-9 items-center justify-center rounded-xl">
                                            <HeartPulse className="size-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-slate-100">Live Monitoring Session</div>
                                            <div className="font-mono text-[11px] text-slate-500">{iframeUrl}</div>
                                        </div>
                                    </div>
                                    <div className="text-xs uppercase tracking-[0.2em] text-emerald-400">Connected</div>
                                </div>
                                <iframe
                                    className="min-h-[760px] w-full flex-1 bg-slate-950"
                                    key={iframeKey}
                                    src={iframeUrl}
                                    title="Uptime Kuma"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default UptimeKuma;
