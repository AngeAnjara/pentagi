import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    ExternalLink,
    Globe,
    HeartPulse,
    KeyRound,
    LoaderCircle,
    PauseCircle,
    PlayCircle,
    RefreshCw,
    ShieldAlert,
    Siren,
    TimerReset,
    Wrench,
    XCircle,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

declare global {
    interface Window {
        io?: (
            uri?: string,
            opts?: Record<string, unknown>,
        ) => UptimeSocket;
    }
}

type UptimeSocket = {
    connected: boolean;
    disconnect: () => void;
    emit: (...args: unknown[]) => void;
    on: (event: string, callback: (...args: unknown[]) => void) => void;
    off: (event: string, callback?: (...args: unknown[]) => void) => void;
};

type IntegrationInfo = {
    name: string;
    url: string;
};

type LoginResponse = {
    ok?: boolean;
    token?: string;
    tokenRequired?: boolean;
    msg?: string;
};

type MonitorItem = {
    id: number;
    name: string;
    description?: string;
    pathName?: string;
    type?: string;
    active?: boolean;
    maintenance?: boolean;
    parent?: number | null;
    url?: string;
    hostname?: string;
    interval?: number;
    retryInterval?: number;
    tags?: Array<{ tag_id?: number; name?: string; color?: string }>;
};

type Heartbeat = {
    id?: number;
    monitor_id: number;
    status: number;
    ping?: number | null;
    msg?: string;
    time: string;
    important?: boolean;
    duration?: number;
    downCount?: number;
};

type MaintenanceItem = {
    id: number;
    title: string;
    description?: string;
    active?: boolean;
    status?: string;
    strategy?: string;
    durationMinutes?: number;
    dateRange?: (string | null)[];
    timeslotList?: Array<{ startDate?: string; endDate?: string }>;
};

type StatusPageItem = {
    id: number;
    slug: string;
    title: string;
    description?: string;
    published?: boolean;
    domainNameList?: string[];
};

type NotificationItem = {
    id?: number;
    name?: string;
    active?: boolean;
    isDefault?: boolean;
};

type UptimePoint = {
    avgPing?: number | null;
    down?: number;
    up?: number;
    uptime?: number;
};

type MonitorStats = {
    avgPing?: number | null;
    uptime24?: number | null;
    uptime30d?: number | null;
    uptime1y?: number | null;
};

type AuthState = 'connexion' | 'pret' | 'authentifie';

const SOCKET_SCRIPT_ID = 'santatra-uptime-socketio-client';
const TOKEN_STORAGE_KEY = 'santatra-uptime-token';
const DOWN = 0;
const UP = 1;
const PENDING = 2;
const MAINTENANCE = 3;

const loadSocketScript = () =>
    new Promise<void>((resolve, reject) => {
        if (window.io) {
            resolve();
            return;
        }

        const currentScript = document.getElementById(SOCKET_SCRIPT_ID) as HTMLScriptElement | null;
        if (currentScript) {
            currentScript.addEventListener('load', () => resolve(), { once: true });
            currentScript.addEventListener('error', () => reject(new Error('script-error')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.id = SOCKET_SCRIPT_ID;
        script.src = '/uptime/app/socket.io/socket.io.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('script-error'));
        document.body.appendChild(script);
    });

const formatRelativeDate = (value?: string) => {
    if (!value) {
        return 'Aucune date';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(parsed);
};

const formatDurationMinutes = (minutes?: number) => {
    if (!minutes) {
        return 'Variable';
    }

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!remainder) {
        return `${hours} h`;
    }
    return `${hours} h ${remainder} min`;
};

const formatPing = (value?: number | null) => {
    if (value == null || Number.isNaN(value)) {
        return '-';
    }

    return `${Math.round(value)} ms`;
};

const formatPercent = (value?: number | null) => {
    if (value == null || Number.isNaN(value)) {
        return '-';
    }

    return `${value.toFixed(value >= 99 ? 2 : 1)} %`;
};

const getStatusLabel = (status?: number) => {
    switch (status) {
        case UP:
            return 'Operationnel';
        case DOWN:
            return 'En panne';
        case MAINTENANCE:
            return 'Maintenance';
        case PENDING:
            return 'En attente';
        default:
            return 'Inconnu';
    }
};

const getStatusBadgeClassName = (status?: number) => {
    switch (status) {
        case UP:
            return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300';
        case DOWN:
            return 'border-rose-500/30 bg-rose-500/15 text-rose-300';
        case MAINTENANCE:
            return 'border-amber-500/30 bg-amber-500/15 text-amber-300';
        case PENDING:
            return 'border-sky-500/30 bg-sky-500/15 text-sky-300';
        default:
            return 'border-slate-700 bg-slate-900/80 text-slate-300';
    }
};

const getStatusIcon = (status?: number) => {
    switch (status) {
        case UP:
            return <CheckCircle2 className="size-4 text-emerald-400" />;
        case DOWN:
            return <XCircle className="size-4 text-rose-400" />;
        case MAINTENANCE:
            return <Wrench className="size-4 text-amber-400" />;
        case PENDING:
            return <Clock3 className="size-4 text-sky-400" />;
        default:
            return <ShieldAlert className="size-4 text-slate-400" />;
    }
};

const getMonitorTarget = (monitor: MonitorItem) => monitor.url || monitor.hostname || monitor.pathName || monitor.type || 'Service';

const UptimeKuma = () => {
    const [integration, setIntegration] = useState<IntegrationInfo | null>(null);
    const [authState, setAuthState] = useState<AuthState>('connexion');
    const [isBooting, setIsBooting] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [socketInstance, setSocketInstance] = useState<UptimeSocket | null>(null);
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');
    const [otpToken, setOtpToken] = useState('');
    const [otpRequired, setOtpRequired] = useState(false);
    const [refreshTick, setRefreshTick] = useState(0);
    const [selectedMonitorId, setSelectedMonitorId] = useState<number | null>(null);
    const [monitors, setMonitors] = useState<Record<number, MonitorItem>>({});
    const [heartbeats, setHeartbeats] = useState<Record<number, Heartbeat[]>>({});
    const [events, setEvents] = useState<Heartbeat[]>([]);
    const [maintenances, setMaintenances] = useState<Record<number, MaintenanceItem>>({});
    const [statusPages, setStatusPages] = useState<Record<number, StatusPageItem>>({});
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [stats, setStats] = useState<Record<number, MonitorStats>>({});
    const [chartData, setChartData] = useState<Record<number, UptimePoint[]>>({});

    useEffect(() => {
        const loadIntegration = async () => {
            try {
                const response = await fetch('/api/v1/integrations/uptime-kuma/info', {
                    credentials: 'include',
                });
                const data = (await response.json()) as IntegrationInfo;
                setIntegration(data);
            } catch {
                setErrorMessage("Impossible de charger l'acces a la supervision.");
            }
        };

        loadIntegration();
    }, []);

    useEffect(() => {
        let cancelled = false;
        let socket: UptimeSocket | null = null;

        const connect = async () => {
            setIsBooting(true);
            setErrorMessage(null);

            try {
                await loadSocketScript();
                if (!window.io || cancelled) {
                    return;
                }

                socket = window.io({
                    path: '/uptime/app/socket.io/',
                    transports: ['websocket', 'polling'],
                    withCredentials: true,
                });

                const onConnect = () => {
                    setAuthState('pret');
                    setErrorMessage(null);
                };

                const onConnectError = () => {
                    setErrorMessage("Connexion impossible a la source de supervision.");
                    setIsBooting(false);
                };

                const onAutoLogin = () => {
                    setAuthState('authentifie');
                    setOtpRequired(false);
                    setErrorMessage(null);
                    setIsBooting(false);
                };

                const onLoginRequired = () => {
                    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
                    if (savedToken) {
                        socket?.emit('loginByToken', savedToken, (response: LoginResponse) => {
                            if (response.ok) {
                                setAuthState('authentifie');
                                setOtpRequired(false);
                                setErrorMessage(null);
                            } else {
                                localStorage.removeItem(TOKEN_STORAGE_KEY);
                                setAuthState('pret');
                            }
                            setIsBooting(false);
                        });
                    } else {
                        setAuthState('pret');
                        setIsBooting(false);
                    }
                };

                const onMonitorList = (list: Record<number, MonitorItem>) => {
                    setMonitors(list);
                    setSelectedMonitorId((current) => {
                        if (current && list[current]) {
                            return current;
                        }
                        const firstId = Object.keys(list)[0];
                        return firstId ? Number(firstId) : null;
                    });
                    setIsLoadingData(false);
                };

                const onHeartbeat = (heartbeat: Heartbeat) => {
                    setHeartbeats((current) => {
                        const next = [...(current[heartbeat.monitor_id] || []), heartbeat].slice(-120);
                        return {
                            ...current,
                            [heartbeat.monitor_id]: next,
                        };
                    });

                    if (heartbeat.important) {
                        setEvents((current) => [heartbeat, ...current].slice(0, 40));
                    }
                };

                const onHeartbeatList = (monitorID: number, list: Heartbeat[]) => {
                    setHeartbeats((current) => ({
                        ...current,
                        [monitorID]: list,
                    }));
                };

                const onMaintenanceList = (list: Record<number, MaintenanceItem>) => {
                    setMaintenances(list);
                };

                const onStatusPageList = (list: Record<number, StatusPageItem>) => {
                    setStatusPages(list);
                };

                const onNotificationList = (list: NotificationItem[]) => {
                    setNotifications(list);
                };

                const onAvgPing = (monitorID: number, avgPing: number | null) => {
                    setStats((current) => ({
                        ...current,
                        [monitorID]: {
                            ...current[monitorID],
                            avgPing,
                        },
                    }));
                };

                const onUptime = (monitorID: number, period: number | string, uptime: number) => {
                    setStats((current) => {
                        const previous = current[monitorID] || {};
                        let next: MonitorStats = previous;

                        if (period === 24) {
                            next = { ...previous, uptime24: uptime };
                        } else if (period === 720) {
                            next = { ...previous, uptime30d: uptime };
                        } else if (period === '1y') {
                            next = { ...previous, uptime1y: uptime };
                        }

                        return {
                            ...current,
                            [monitorID]: next,
                        };
                    });
                };

                socket.on('connect', onConnect);
                socket.on('connect_error', onConnectError);
                socket.on('autoLogin', onAutoLogin);
                socket.on('loginRequired', onLoginRequired);
                socket.on('monitorList', onMonitorList);
                socket.on('heartbeat', onHeartbeat);
                socket.on('heartbeatList', onHeartbeatList);
                socket.on('maintenanceList', onMaintenanceList);
                socket.on('statusPageList', onStatusPageList);
                socket.on('notificationList', onNotificationList);
                socket.on('avgPing', onAvgPing);
                socket.on('uptime', onUptime);

                setSocketInstance(socket);
            } catch {
                if (!cancelled) {
                    setErrorMessage('La console de supervision ne repond pas encore.');
                    setIsBooting(false);
                }
            }
        };

        connect();

        return () => {
            cancelled = true;
            if (socket) {
                socket.disconnect();
            }
        };
    }, [refreshTick]);

    useEffect(() => {
        if (!socketInstance || authState !== 'authentifie') {
            return;
        }

        setIsLoadingData(true);
        socketInstance.emit('getMonitorList', () => undefined);
        socketInstance.emit('getMaintenanceList', () => undefined);
        socketInstance.emit('monitorImportantHeartbeatListPaged', null, 0, 20, (response: { ok?: boolean; data?: Heartbeat[] }) => {
            if (response.ok && response.data) {
                setEvents(response.data);
            }
        });
    }, [authState, socketInstance, refreshTick]);

    useEffect(() => {
        if (!socketInstance || authState !== 'authentifie' || !selectedMonitorId) {
            return;
        }

        socketInstance.emit('getMonitorChartData', selectedMonitorId, 24, (response: { ok?: boolean; data?: UptimePoint[] }) => {
            if (response.ok && response.data) {
                setChartData((current) => ({
                    ...current,
                    [selectedMonitorId]: response.data,
                }));
            }
        });

        socketInstance.emit('monitorImportantHeartbeatListPaged', selectedMonitorId, 0, 12, (response: { ok?: boolean; data?: Heartbeat[] }) => {
            if (response.ok && response.data) {
                setEvents((current) => {
                    const globalOthers = current.filter((item) => item.monitor_id !== selectedMonitorId);
                    return [...response.data, ...globalOthers].slice(0, 30);
                });
            }
        });
    }, [authState, selectedMonitorId, socketInstance]);

    const handleLogin = () => {
        if (!socketInstance) {
            return;
        }

        setIsAuthenticating(true);
        setErrorMessage(null);

        socketInstance.emit(
            'login',
            {
                username,
                password,
                token: otpToken || undefined,
            },
            (response: LoginResponse) => {
                setIsAuthenticating(false);

                if (response.tokenRequired) {
                    setOtpRequired(true);
                    setErrorMessage('Le code a usage unique est requis pour terminer la connexion.');
                    return;
                }

                if (response.ok) {
                    if (response.token) {
                        localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
                    }
                    setAuthState('authentifie');
                    setOtpRequired(false);
                    setPassword('');
                    setOtpToken('');
                    setErrorMessage(null);
                    setRefreshTick((value) => value + 1);
                    return;
                }

                setErrorMessage('Identifiants invalides ou acces refuse.');
            },
        );
    };

    const handleLogout = () => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setMonitors({});
        setHeartbeats({});
        setEvents([]);
        setMaintenances({});
        setStatusPages({});
        setNotifications([]);
        setStats({});
        setChartData({});
        setSelectedMonitorId(null);

        socketInstance?.emit('logout', () => {
            setAuthState('pret');
        });
    };

    const handleRefresh = () => {
        setRefreshTick((value) => value + 1);
    };

    const handleMonitorAction = (action: 'pauseMonitor' | 'resumeMonitor', monitorID: number) => {
        socketInstance?.emit(action, monitorID, () => {
            socketInstance.emit('getMonitorList', () => undefined);
        });
    };

    const monitorEntries = useMemo(
        () =>
            Object.values(monitors).sort((left, right) => {
                const leftStatus = heartbeats[left.id]?.at(-1)?.status ?? 99;
                const rightStatus = heartbeats[right.id]?.at(-1)?.status ?? 99;
                if (leftStatus !== rightStatus) {
                    return leftStatus - rightStatus;
                }
                return left.name.localeCompare(right.name);
            }),
        [heartbeats, monitors],
    );

    const selectedMonitor = selectedMonitorId ? monitors[selectedMonitorId] : null;
    const selectedHeartbeats = selectedMonitorId ? heartbeats[selectedMonitorId] || [] : [];
    const selectedStats = (selectedMonitorId && stats[selectedMonitorId]) || {};
    const selectedChart = (selectedMonitorId && chartData[selectedMonitorId]) || [];
    const currentHeartbeat = selectedHeartbeats.at(-1);

    const globalSummary = useMemo(() => {
        const summary = {
            total: monitorEntries.length,
            up: 0,
            down: 0,
            maintenance: 0,
            pending: 0,
        };

        for (const monitor of monitorEntries) {
            const status = heartbeats[monitor.id]?.at(-1)?.status;
            if (status === UP) {
                summary.up += 1;
            } else if (status === DOWN) {
                summary.down += 1;
            } else if (status === MAINTENANCE) {
                summary.maintenance += 1;
            } else {
                summary.pending += 1;
            }
        }

        return summary;
    }, [heartbeats, monitorEntries]);

    const sourceUrl = integration?.url || '/uptime/app/';

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
                                            Supervision
                                        </span>
                                        <BreadcrumbPage className="text-base font-semibold tracking-tight">
                                            Surveillance des services
                                        </BreadcrumbPage>
                                    </div>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleRefresh}
                            size="sm"
                            variant="outline"
                        >
                            <RefreshCw />
                            Actualiser
                        </Button>
                        <Button
                            asChild
                            size="sm"
                            variant="ghost"
                        >
                            <a
                                href={sourceUrl}
                                rel="noreferrer"
                                target="_blank"
                            >
                                <ExternalLink />
                                Console source
                            </a>
                        </Button>
                    </div>
                </div>
            </header>

            <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl flex-col gap-4 p-4">
                <Card className="panel-shell border-slate-800/80 bg-slate-950/82">
                    <CardContent className="grid gap-4 p-5 lg:grid-cols-[1.4fr_1fr]">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                <ShieldAlert className="size-3.5 text-sky-400" />
                                Centre de supervision natif
                            </div>
                            <div className="text-xl font-semibold tracking-tight text-slate-50">
                                Tableau de sante en temps reel dans Santatra
                            </div>
                            <div className="max-w-3xl text-sm leading-6 text-slate-400">
                                Les controles essentiels de supervision remontent directement dans le dashboard principal: etats des services,
                                incidents recents, maintenances, pages de statut et indicateurs de disponibilite.
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <SummaryCard
                                icon={<CheckCircle2 className="size-4 text-emerald-400" />}
                                label="Services operationnels"
                                tone="emerald"
                                value={`${globalSummary.up}/${globalSummary.total || 0}`}
                            />
                            <SummaryCard
                                icon={<Siren className="size-4 text-rose-400" />}
                                label="Alertes actives"
                                tone="rose"
                                value={String(globalSummary.down)}
                            />
                            <SummaryCard
                                icon={<Wrench className="size-4 text-amber-400" />}
                                label="Maintenances"
                                tone="amber"
                                value={String(globalSummary.maintenance)}
                            />
                            <SummaryCard
                                icon={<Globe className="size-4 text-sky-400" />}
                                label="Pages de statut"
                                tone="sky"
                                value={String(Object.keys(statusPages).length)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {isBooting ? (
                    <Card className="panel-shell border-slate-800/80 bg-slate-950/84">
                        <CardContent className="flex min-h-[18rem] items-center justify-center p-8">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <LoaderCircle className="size-8 animate-spin text-sky-400" />
                                <div className="text-base font-medium text-slate-100">Connexion a la supervision</div>
                                <div className="max-w-md text-sm text-slate-400">
                                    Santatra prepare la passerelle temps reel et charge les donnees de monitoring.
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : authState !== 'authentifie' ? (
                    <Card className="panel-shell border-slate-800/80 bg-slate-950/84">
                        <CardHeader className="border-b border-slate-800/80">
                            <CardTitle className="text-slate-50">Connexion a la supervision</CardTitle>
                            <CardDescription>
                                Connecte la source de monitoring pour afficher les services, alertes et etats en temps reel dans Santatra.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="grid gap-4">
                                <label className="grid gap-2 text-sm text-slate-300">
                                    Identifiant
                                    <Input
                                        onChange={(event) => setUsername(event.target.value)}
                                        placeholder="admin"
                                        value={username}
                                    />
                                </label>
                                <label className="grid gap-2 text-sm text-slate-300">
                                    Mot de passe
                                    <Input
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="Votre mot de passe"
                                        type="password"
                                        value={password}
                                    />
                                </label>
                                {otpRequired && (
                                    <label className="grid gap-2 text-sm text-slate-300">
                                        Code a usage unique
                                        <Input
                                            onChange={(event) => setOtpToken(event.target.value)}
                                            placeholder="000000"
                                            value={otpToken}
                                        />
                                    </label>
                                )}
                                {errorMessage && (
                                    <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                                        {errorMessage}
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <Button
                                        disabled={isAuthenticating || !username || !password}
                                        onClick={handleLogin}
                                    >
                                        {isAuthenticating ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
                                        Se connecter
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                    >
                                        <a
                                            href={sourceUrl}
                                            rel="noreferrer"
                                            target="_blank"
                                        >
                                            <ExternalLink />
                                            Ouvrir la source
                                        </a>
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                                <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Connexion unifiee</div>
                                <div className="mt-3 text-lg font-semibold text-slate-100">Santatra agrege la supervision dans son propre shell</div>
                                <div className="mt-2 text-sm leading-6 text-slate-400">
                                    Une fois la session ouverte, les donnees remontent dans les cartes, les listes de services et le flux d’incidents sans quitter l’interface principale.
                                </div>
                                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Point d'acces</div>
                                    <div className="mt-1 font-mono text-xs text-slate-300">{sourceUrl}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 xl:grid-cols-[1.1fr_1.55fr_0.95fr]">
                        <Card className="panel-shell border-slate-800/80 bg-slate-950/84">
                            <CardHeader className="border-b border-slate-800/80 pb-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-slate-50">Services surveilles</CardTitle>
                                        <CardDescription>
                                            {monitorEntries.length
                                                ? `${monitorEntries.length} service(s) remontent dans la console`
                                                : 'Aucun service de monitoring disponible'}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        onClick={handleLogout}
                                        size="sm"
                                        variant="ghost"
                                    >
                                        Deconnexion
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[calc(100dvh-18.5rem)]">
                                    <div className="grid gap-2 p-3">
                                        {monitorEntries.map((monitor) => {
                                            const lastBeat = heartbeats[monitor.id]?.at(-1);
                                            const monitorStats = stats[monitor.id];
                                            const isSelected = monitor.id === selectedMonitorId;

                                            return (
                                                <button
                                                    className={cn(
                                                        'rounded-2xl border px-4 py-3 text-left transition-colors',
                                                        isSelected
                                                            ? 'border-sky-500/35 bg-sky-500/10'
                                                            : 'border-slate-800 bg-slate-900/55 hover:bg-slate-900/80',
                                                    )}
                                                    key={monitor.id}
                                                    onClick={() => setSelectedMonitorId(monitor.id)}
                                                    type="button"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                {getStatusIcon(lastBeat?.status)}
                                                                <div className="truncate text-sm font-semibold text-slate-100">
                                                                    {monitor.name}
                                                                </div>
                                                            </div>
                                                            <div className="truncate text-xs text-slate-500">
                                                                {getMonitorTarget(monitor)}
                                                            </div>
                                                        </div>
                                                        <Badge className={cn('shrink-0', getStatusBadgeClassName(lastBeat?.status))}>
                                                            {getStatusLabel(lastBeat?.status)}
                                                        </Badge>
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                                                        <div>
                                                            <span className="text-slate-500">Latence</span>
                                                            <div className="mt-1 font-medium text-slate-200">
                                                                {formatPing(monitorStats?.avgPing)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-500">24 h</span>
                                                            <div className="mt-1 font-medium text-slate-200">
                                                                {formatPercent(monitorStats?.uptime24)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4">
                            <Card className="panel-shell border-slate-800/80 bg-slate-950/84">
                                <CardHeader className="border-b border-slate-800/80 pb-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-slate-50">
                                                {selectedMonitor?.name || 'Selectionne un service'}
                                            </CardTitle>
                                            <CardDescription>
                                                {selectedMonitor ? getMonitorTarget(selectedMonitor) : 'Choisis un service dans la colonne de gauche.'}
                                            </CardDescription>
                                        </div>

                                        {selectedMonitor && (
                                            <div className="flex items-center gap-2">
                                                <Badge className={getStatusBadgeClassName(currentHeartbeat?.status)}>
                                                    {getStatusLabel(currentHeartbeat?.status)}
                                                </Badge>
                                                {selectedMonitor.active ? (
                                                    <Button
                                                        onClick={() => handleMonitorAction('pauseMonitor', selectedMonitor.id)}
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <PauseCircle />
                                                        Suspendre
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        onClick={() => handleMonitorAction('resumeMonitor', selectedMonitor.id)}
                                                        size="sm"
                                                    >
                                                        <PlayCircle />
                                                        Relancer
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent className="grid gap-4 p-5">
                                    {selectedMonitor ? (
                                        <>
                                            <div className="grid gap-3 md:grid-cols-3">
                                                <MetricPanel label="Latence moyenne" value={formatPing(selectedStats.avgPing)} />
                                                <MetricPanel label="Disponibilite 24 h" value={formatPercent(selectedStats.uptime24)} />
                                                <MetricPanel label="Disponibilite 30 j" value={formatPercent(selectedStats.uptime30d)} />
                                            </div>

                                            <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-100">Tendance de disponibilite</div>
                                                        <div className="text-xs text-slate-500">Lecture condensee des 24 dernieres heures</div>
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        Dernier point: {currentHeartbeat ? formatRelativeDate(currentHeartbeat.time) : 'Aucun'}
                                                    </div>
                                                </div>
                                                <div className="flex h-18 items-end gap-1">
                                                    {selectedChart.length ? (
                                                        selectedChart.map((point, index) => {
                                                            const value = Math.max(4, Math.round((point.uptime || 0) * 100));
                                                            const barClass =
                                                                point.uptime === 1
                                                                    ? 'bg-emerald-400/85'
                                                                    : point.uptime === 0
                                                                      ? 'bg-rose-400/85'
                                                                      : 'bg-amber-400/85';

                                                            return (
                                                                <div
                                                                    className="flex-1"
                                                                    key={`${selectedMonitor.id}-${index}`}
                                                                    title={`${Math.round((point.uptime || 0) * 100)} %`}
                                                                >
                                                                    <div
                                                                        className={cn('w-full rounded-t-sm transition-all', barClass)}
                                                                        style={{ height: `${value}%` }}
                                                                    />
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="text-sm text-slate-500">Pas encore de courbe disponible.</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                    <div className="text-sm font-semibold text-slate-100">Historique recent</div>
                                                    <div className="text-xs text-slate-500">{selectedHeartbeats.length} points</div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedHeartbeats.length ? (
                                                        selectedHeartbeats.slice(-40).map((heartbeat) => (
                                                            <div
                                                                className={cn(
                                                                    'h-3 w-8 rounded-full',
                                                                    heartbeat.status === UP
                                                                        ? 'bg-emerald-400'
                                                                        : heartbeat.status === DOWN
                                                                          ? 'bg-rose-400'
                                                                          : heartbeat.status === MAINTENANCE
                                                                            ? 'bg-amber-400'
                                                                            : 'bg-sky-400',
                                                                )}
                                                                key={`${heartbeat.monitor_id}-${heartbeat.time}-${heartbeat.status}`}
                                                                title={`${getStatusLabel(heartbeat.status)} - ${formatRelativeDate(heartbeat.time)}`}
                                                            />
                                                        ))
                                                    ) : (
                                                        <div className="text-sm text-slate-500">Aucun heartbeat recu pour ce service.</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-2">
                                                <MetricText
                                                    label="Cadence de verification"
                                                    value={selectedMonitor.interval ? `${selectedMonitor.interval} s` : 'Non renseignee'}
                                                />
                                                <MetricText
                                                    label="Intervalle de reprise"
                                                    value={selectedMonitor.retryInterval ? `${selectedMonitor.retryInterval} s` : 'Standard'}
                                                />
                                                <MetricText
                                                    label="Type de sonde"
                                                    value={selectedMonitor.type || 'Inconnu'}
                                                />
                                                <MetricText
                                                    label="Dernier message"
                                                    value={currentHeartbeat?.msg || 'Aucun message detaille'}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
                                            Choisis un service pour afficher son detail, sa latence et son historique.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-4">
                            <Card className="panel-shell border-slate-800/80 bg-slate-950/84">
                                <CardHeader className="border-b border-slate-800/80 pb-4">
                                    <CardTitle className="text-slate-50">Flux d’incidents</CardTitle>
                                    <CardDescription>Transitions importantes et signaux critiques recents.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-72">
                                        <div className="grid gap-3 p-4">
                                            {events.length ? (
                                                events.map((event, index) => {
                                                    const monitor = monitors[event.monitor_id];
                                                    return (
                                                        <div
                                                            className="rounded-2xl border border-slate-800 bg-slate-900/55 p-3"
                                                            key={`${event.monitor_id}-${event.time}-${index}`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        {getStatusIcon(event.status)}
                                                                        <span className="truncate text-sm font-semibold text-slate-100">
                                                                            {monitor?.name || `Service #${event.monitor_id}`}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-1 text-xs text-slate-500">{event.msg || getStatusLabel(event.status)}</div>
                                                                </div>
                                                                <div className="text-right text-[11px] text-slate-500">
                                                                    <div>{formatRelativeDate(event.time)}</div>
                                                                    <div className="mt-1">{formatPing(event.ping)}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-4 text-sm text-slate-500">Aucun incident important recemment.</div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card className="panel-shell border-slate-800/80 bg-slate-950/84">
                                <CardHeader className="border-b border-slate-800/80 pb-4">
                                    <CardTitle className="text-slate-50">Maintenances et diffusion</CardTitle>
                                    <CardDescription>Operations programmees, pages publiques et relais d’alerte.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 p-4">
                                    <div className="grid gap-3">
                                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                            <TimerReset className="size-3.5 text-amber-400" />
                                            Maintenances
                                        </div>
                                        {Object.values(maintenances).length ? (
                                            Object.values(maintenances)
                                                .slice(0, 4)
                                                .map((item) => (
                                                    <div
                                                        className="rounded-2xl border border-slate-800 bg-slate-900/55 p-3"
                                                        key={item.id}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <div className="text-sm font-semibold text-slate-100">{item.title}</div>
                                                                <div className="mt-1 text-xs text-slate-500">
                                                                    {item.description || 'Maintenance planifiee'}
                                                                </div>
                                                            </div>
                                                            <Badge className={item.active ? 'border-amber-500/30 bg-amber-500/15 text-amber-300' : 'border-slate-700 bg-slate-900 text-slate-300'}>
                                                                {item.active ? 'Active' : 'Planifiee'}
                                                            </Badge>
                                                        </div>
                                                        <div className="mt-3 text-xs text-slate-400">
                                                            Duree: {formatDurationMinutes(item.durationMinutes)}
                                                        </div>
                                                    </div>
                                                ))
                                        ) : (
                                            <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-3 text-sm text-slate-500">
                                                Aucune maintenance enregistree.
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-3">
                                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                            <Globe className="size-3.5 text-sky-400" />
                                            Pages de statut
                                        </div>
                                        {Object.values(statusPages).length ? (
                                            Object.values(statusPages)
                                                .slice(0, 4)
                                                .map((page) => (
                                                    <div
                                                        className="rounded-2xl border border-slate-800 bg-slate-900/55 p-3"
                                                        key={page.id}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div>
                                                                <div className="text-sm font-semibold text-slate-100">{page.title}</div>
                                                                <div className="mt-1 text-xs text-slate-500">
                                                                    {page.domainNameList?.[0] || `/${page.slug}`}
                                                                </div>
                                                            </div>
                                                            <Badge className={page.published ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-300'}>
                                                                {page.published ? 'Publiee' : 'Privee'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))
                                        ) : (
                                            <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-3 text-sm text-slate-500">
                                                Aucune page de statut disponible.
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-3">
                                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                            <AlertTriangle className="size-3.5 text-rose-400" />
                                            Notifications
                                        </div>
                                        {notifications.length ? (
                                            notifications.slice(0, 5).map((item, index) => (
                                                <div
                                                    className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/55 px-3 py-2"
                                                    key={`${item.name || 'notification'}-${index}`}
                                                >
                                                    <div className="text-sm text-slate-100">{item.name || 'Canal sans nom'}</div>
                                                    <Badge className={item.active ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-300'}>
                                                        {item.active ? 'Actif' : 'Inactif'}
                                                    </Badge>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-3 text-sm text-slate-500">
                                                Aucun canal de notification visible.
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {isLoadingData && authState === 'authentifie' && (
                    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center">
                        <div className="rounded-full border border-slate-800 bg-slate-950/95 px-4 py-2 text-sm text-slate-300 shadow-2xl backdrop-blur">
                            Synchronisation de la supervision en cours...
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

const SummaryCard = ({
    icon,
    label,
    tone,
    value,
}: {
    icon: ReactNode;
    label: string;
    tone: 'amber' | 'emerald' | 'rose' | 'sky';
    value: string;
}) => (
    <div
        className={cn(
            'rounded-2xl border p-4',
            tone === 'emerald' && 'border-emerald-500/20 bg-emerald-500/10',
            tone === 'rose' && 'border-rose-500/20 bg-rose-500/10',
            tone === 'amber' && 'border-amber-500/20 bg-amber-500/10',
            tone === 'sky' && 'border-sky-500/20 bg-sky-500/10',
        )}
    >
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            {icon}
            {label}
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">{value}</div>
    </div>
);

const MetricPanel = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="mt-2 text-xl font-semibold text-slate-50">{value}</div>
    </div>
);

const MetricText = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="mt-2 text-sm leading-6 text-slate-200">{value}</div>
    </div>
);

export default UptimeKuma;
