import { auth } from "@/auth";
import {
  Calendar,
  Clock,
  Music,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

// Card component
function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <div className="bg-beta-navy rounded-2xl p-6 border border-beta-gray-blue/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-beta-gray-blue">{title}</p>
          <p className="text-3xl font-semibold text-beta-cream mt-1">{value}</p>
          {description && (
            <p className="text-xs text-beta-gray-blue mt-1">{description}</p>
          )}
          {trend && (
            <p
              className={`text-xs mt-2 ${
                trend.positive ? "text-green-400" : "text-red-400"
              }`}
            >
              {trend.positive ? "+" : ""}
              {trend.value}% em relacao ao mes anterior
            </p>
          )}
        </div>
        <div className="p-3 bg-beta-terracotta/20 rounded-xl">
          <Icon className="h-6 w-6 text-beta-terracotta" />
        </div>
      </div>
    </div>
  );
}

// Event card component
function EventCard({
  title,
  date,
  time,
  type,
  status,
}: {
  title: string;
  date: string;
  time: string;
  type: string;
  status: "confirmado" | "pendente" | "cancelado";
}) {
  const statusConfig = {
    confirmado: {
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    pendente: {
      icon: AlertCircle,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
    },
    cancelado: {
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-400/10",
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="bg-beta-navy/50 rounded-xl p-4 border border-beta-gray-blue/10 hover:border-beta-terracotta/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-beta-cream">{title}</h3>
          <p className="text-sm text-beta-gray-blue mt-1">{type}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-beta-gray-blue">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {time}
            </span>
          </div>
        </div>
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <StatusIcon className={`h-4 w-4 ${config.color}`} />
        </div>
      </div>
    </div>
  );
}

// Scale card component
function ScaleCard({
  event,
  date,
  role,
  status,
}: {
  event: string;
  date: string;
  role: string;
  status: "pendente" | "confirmado" | "recusado";
}) {
  const statusConfig = {
    pendente: {
      label: "Pendente",
      color: "border-beta-terracotta bg-beta-terracotta/10",
    },
    confirmado: {
      label: "Confirmado",
      color: "border-green-500 bg-green-500/10",
    },
    recusado: {
      label: "Recusado",
      color: "border-red-500 bg-red-500/10",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`rounded-xl p-4 border-l-4 bg-beta-navy/50 ${config.color}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-beta-cream">{event}</h3>
          <p className="text-sm text-beta-gray-blue mt-1">{role}</p>
          <p className="text-xs text-beta-gray-blue mt-2 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {date}
          </p>
        </div>
        {status === "pendente" && (
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              Aceitar
            </button>
            <button className="px-3 py-1.5 text-xs font-medium bg-beta-black/50 text-beta-gray-blue rounded-lg hover:bg-beta-black/70 transition-colors">
              Recusar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name?.split(" ")[0] || "Usuario";

  // Get current hour for greeting
  const hour = new Date().getHours();
  let greeting = "Boa noite";
  if (hour >= 5 && hour < 12) {
    greeting = "Bom dia";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Boa tarde";
  }

  // Mock data - replace with real data later
  const upcomingEvents = [
    {
      title: "Culto de Domingo",
      date: "24 Mar 2026",
      time: "10:00",
      type: "Culto Dominical",
      status: "confirmado" as const,
    },
    {
      title: "Ensaio Geral",
      date: "22 Mar 2026",
      time: "19:00",
      type: "Ensaio",
      status: "pendente" as const,
    },
    {
      title: "Culto de Jovens",
      date: "28 Mar 2026",
      time: "19:30",
      type: "Culto Especial",
      status: "confirmado" as const,
    },
  ];

  const pendingScales = [
    {
      event: "Culto de Domingo",
      date: "24 Mar 2026",
      role: "Vocal",
      status: "pendente" as const,
    },
    {
      event: "Culto de Quarta",
      date: "26 Mar 2026",
      role: "Guitarra",
      status: "pendente" as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h2 className="text-3xl font-semibold text-beta-cream">
          {greeting}, {userName}!
        </h2>
        <p className="text-beta-gray-blue mt-1">
          Confira suas escalas e proximos eventos
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Proximos Eventos"
          value={8}
          description="Este mes"
          icon={Calendar}
        />
        <StatsCard
          title="Escalas Pendentes"
          value={2}
          description="Aguardando confirmacao"
          icon={Clock}
        />
        <StatsCard
          title="Ministerios"
          value={3}
          description="Voce participa"
          icon={Users}
        />
        <StatsCard
          title="Musicas Ensaiadas"
          value={15}
          description="Este mes"
          icon={Music}
          trend={{ value: 12, positive: true }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-beta-cream">
              Proximos Eventos
            </h3>
            <Link
              href="/eventos"
              className="text-sm text-beta-terracotta hover:text-beta-terracotta/80 transition-colors"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((event, index) => (
              <EventCard key={index} {...event} />
            ))}
          </div>
        </div>

        {/* Pending Scales */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-beta-cream">
              Minhas Escalas
            </h3>
            <Link
              href="/escalas"
              className="text-sm text-beta-terracotta hover:text-beta-terracotta/80 transition-colors"
            >
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {pendingScales.length > 0 ? (
              pendingScales.map((scale, index) => (
                <ScaleCard key={index} {...scale} />
              ))
            ) : (
              <div className="bg-beta-navy/50 rounded-xl p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <p className="text-beta-cream font-medium">
                  Todas as escalas confirmadas!
                </p>
                <p className="text-sm text-beta-gray-blue mt-1">
                  Voce nao tem escalas pendentes
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-beta-navy/30 rounded-2xl p-6 border border-beta-gray-blue/10">
        <h3 className="text-lg font-semibold text-beta-cream mb-4">
          Acoes Rapidas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/eventos/novo"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-beta-navy/50 hover:bg-beta-navy transition-colors group"
          >
            <Calendar className="h-8 w-8 text-beta-gray-blue group-hover:text-beta-terracotta transition-colors" />
            <span className="text-sm text-beta-cream">Novo Evento</span>
          </Link>
          <Link
            href="/escalas/nova"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-beta-navy/50 hover:bg-beta-navy transition-colors group"
          >
            <Clock className="h-8 w-8 text-beta-gray-blue group-hover:text-beta-terracotta transition-colors" />
            <span className="text-sm text-beta-cream">Nova Escala</span>
          </Link>
          <Link
            href="/musicas/nova"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-beta-navy/50 hover:bg-beta-navy transition-colors group"
          >
            <Music className="h-8 w-8 text-beta-gray-blue group-hover:text-beta-terracotta transition-colors" />
            <span className="text-sm text-beta-cream">Nova Musica</span>
          </Link>
          <Link
            href="/ministerios"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-beta-navy/50 hover:bg-beta-navy transition-colors group"
          >
            <Users className="h-8 w-8 text-beta-gray-blue group-hover:text-beta-terracotta transition-colors" />
            <span className="text-sm text-beta-cream">Ministerios</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
