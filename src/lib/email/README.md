# Sistema de Notificacoes por Email - Beta Church

Sistema completo de envio de emails usando **Resend** com templates **React Email**.

## Configuracao

### Variaveis de Ambiente

Adicione ao seu `.env`:

```env
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL="Beta Church <noreply@beta.church>"

# URLs
NEXT_PUBLIC_APP_URL=https://app.beta.church

# Seguranca
EMAIL_TOKEN_SECRET=sua-chave-secreta-aqui
CRON_SECRET=chave-para-cron-jobs
```

## Uso

### Enviar Convite de Escala

```typescript
import { sendScheduleInvite } from "@/lib/email"

// Busque a escala com relacionamentos
const schedule = await prisma.schedule.findUnique({
  where: { id: "xxx" },
  include: { event: true, ministry: true, user: true },
})

// Envia o email
const result = await sendScheduleInvite(schedule)

if (result.success) {
  console.log("Email enviado:", result.data?.id)
} else {
  console.error("Erro:", result.error)
}
```

### Enviar Lembrete de Escala

```typescript
import { sendScheduleReminder } from "@/lib/email"

// daysUntilEvent: quantos dias faltam para o evento
await sendScheduleReminder(schedule, 3)
```

### Enviar Confirmacao

```typescript
import { sendScheduleConfirmation } from "@/lib/email"

const teamMembers = [
  { name: "Joao", position: "Guitarra" },
  { name: "Maria", position: "Vocal" },
]

await sendScheduleConfirmation(schedule, teamMembers)
```

### Notificar Alteracao na Escala

```typescript
import { sendScheduleChanged } from "@/lib/email"

const changes = [
  { field: "Horario", oldValue: "19:00", newValue: "19:30" },
  { field: "Funcao", oldValue: "Guitarra", newValue: "Violao" },
]

await sendScheduleChanged(schedule, changes, "Admin", true)
```

### Enviar Setlist para Musicos

```typescript
import { sendSetlistUpdate } from "@/lib/email"

const event = await prisma.event.findUnique({
  where: { id: "xxx" },
  include: { setlists: { include: { song: true } } },
})

const musicians = [
  { id: "1", name: "Joao", email: "joao@email.com" },
  { id: "2", name: "Maria", email: "maria@email.com" },
]

await sendSetlistUpdate(event, musicians, "Lider do Louvor", true)
```

## Cron Job - Lembretes Automaticos

O endpoint `/api/cron/reminders` envia lembretes automaticamente.

### Configuracao Vercel Cron

Ja configurado em `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Isso executa todos os dias as 8h da manha.

### Teste Manual

```bash
curl -H "x-cron-secret: $CRON_SECRET" \
  https://app.beta.church/api/cron/reminders
```

## Confirmacao via Link

Quando o usuario clica no link do email:

1. Valida o token
2. Atualiza o status da escala
3. Envia email de confirmacao (se confirmou)
4. Redireciona para o sistema com mensagem

## Templates Disponiveis

| Template | Descricao |
|----------|-----------|
| `schedule-invite` | Convite para escala com botoes Confirmar/Recusar |
| `schedule-reminder` | Lembrete X dias antes do evento |
| `schedule-confirmed` | Confirmacao de presenca recebida |
| `schedule-changed` | Notificacao de alteracoes na escala |
| `setlist-update` | Setlist atualizado para musicos |

## Cores da Identidade Beta

```typescript
const colors = {
  primary: "#6366f1",    // Indigo-500
  secondary: "#8b5cf6",  // Violet-500
  success: "#22c55e",    // Green-500
  error: "#ef4444",      // Red-500
  warning: "#f59e0b",    // Amber-500
}
```
