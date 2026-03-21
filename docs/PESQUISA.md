# Pesquisa de Referência - Sistema Contágio e Beta

## 1. Visão Geral do Projeto

### Objetivo
Sistema de gestão de operações de eventos para a Igreja Beta, focado em:
- Escalas de equipes (técnica, louvor, contagie/cerimonial, pastores)
- Gestão de cultos e eventos
- Integração com ProPresenter
- Acesso web e mobile (PWA com suporte offline)

### Eventos Principais
- Culto de Domingo (manhã e noite)
- Eventos personalizados/genéricos

---

## 2. Análise do Planning Center Services (Referência Principal)

### Visão Geral
O Planning Center é usado por mais de 100.000 igrejas mundialmente. O módulo **Services** é o principal foco de referência para o Contágio e Beta.

**Fonte**: [Planning Center Services](https://www.planningcenter.com/services)

### Funcionalidades do Planning Center Services

#### 2.1 Planejamento de Cultos
- **Planos de Serviço**: Organização de músicas, voluntários e notas
- **Tipos de Serviço**: Categorização (Tradicional, Contemporâneo, Juventude)
- **Ordem de Serviço**: Fluxo detalhado com timestamps
- **Services LIVE**: Exibição em tempo real do item atual do culto

#### 2.2 Escalas de Voluntários
- **Equipes por Função**: Berçário, Hospedagem, Recepção, Técnica, etc.
- **Matriz de Agendamento**: Visualização de múltiplos planos por semanas/meses
- **Templates**: Reutilização de escalas regulares
- **Auto-agendamento**: Preenchimento automático baseado em histórico
- **Lembretes Automáticos**: Emails, SMS e push notifications

#### 2.3 Preferências de Voluntários
- Datas bloqueadas (indisponibilidade)
- Inscrições abertas para auto-escala
- Preferências familiares (servir junto ou separado)
- Sincronização com Google Calendar/iCal

#### 2.4 Gestão de Músicas
- Biblioteca centralizada de canções
- Múltiplos arranjos por música
- Transposição de tons
- Tags customizáveis (rápido, comunhão, etc.)
- Relatório CCLI automático

#### 2.5 Ferramentas de Ensaio
- **Music Stand App**: Anotações em partituras, pedal para virar páginas
- **Player de Mídia**: Reprodução com loops de seções
- **Songbook PDF**: Coletâneas impressas

#### 2.6 Integrações
- RehearsalPack, SongSelect, PraiseCharts, MultiTracks
- **ProPresenter** (integração nativa!)

### Preços Planning Center Services
| Plano | Membros | Armazenamento | Preço |
|-------|---------|---------------|-------|
| Gratuito | 5 | 100MB | $0 |
| Starter | 20 | - | $15/mês |
| Growth | 100+ | - | $59-239/mês |

---

## 3. Integração Planning Center + ProPresenter

### Descoberta Importante!
Existe uma **integração nativa** entre Planning Center Services e ProPresenter 7.7+.

**Fontes**:
- [Planning Center + ProPresenter Integration](https://www.planningcenter.com/integrations/propresenter)
- [Using Planning Center with ProPresenter](https://support.renewedvision.com/hc/en-us/articles/4408670102419-Using-Planning-Center-with-ProPresenter)

### Funcionalidades da Integração
1. **Sincronização de Planos**: ProPresenter importa ordem de serviço do Planning Center
2. **Match Automático de Músicas**: Vincula automaticamente músicas com mesmo nome
3. **Upload/Download Automático**: Apresentações sincronizadas bidirecionalmente
4. **Arranjos de Sequências**: Conversão de sequências do PC para arranjos do PP
5. **Services LIVE no Stage Display**: Dados ao vivo integrados na tela de palco

### Fluxo de Trabalho Colaborativo
```
Pastor/Worship Leader → Cria plano no Planning Center
                              ↓
Designer Gráfico → Anexa apresentações e mídia
                              ↓
Operador ProPresenter → Importa como playlist automaticamente
                              ↓
Mudanças sincronizam automaticamente ↔
```

---

## 4. API do ProPresenter

### Visão Geral
O ProPresenter 7.9+ possui uma **API pública oficial** além de protocolos WebSocket.

**Fontes**:
- [ProPresenter Official API](https://openapi.propresenter.com/)
- [Community API Documentation](https://github.com/jeffmikels/ProPresenter-API)
- [TCP/IP API Documentation](https://support.renewedvision.com/hc/en-us/articles/31606866768147-TCP-IP-Connections-with-ProPresenter-API)

### Protocolos Disponíveis

#### 4.1 HTTP/REST API (Oficial - v7.9+)
- Documentação completa em `openapi.propresenter.com`
- Acesso via Network Settings → "API Documentation"

#### 4.2 TCP/IP API
```json
{
  "url": "v1/stage/message",
  "method": "PUT",
  "body": "content here",
  "chunked": false
}
```

#### 4.3 WebSocket API
Dois canais: `/remote` e `/stagedisplay`

### Endpoints Principais (Pro7)

| Ação | Descrição |
|------|-----------|
| `presentationTriggerIndex` | Dispara slide específico |
| `presentationTriggerNext` | Próximo slide |
| `presentationTriggerPrevious` | Slide anterior |
| `presentationRequest` | Solicita apresentação |
| `presentationCurrent` | Apresentação ativa atual |
| Audio/Media Playlist Trigger | Dispara playlists de áudio/mídia |

### Endereçamento de Playlists
```
0:0      → Primeira apresentação da primeira playlist
0.0:0    → Primeira apresentação do primeiro grupo da primeira playlist
```

### Possibilidades de Integração para o Contágio e Beta
1. ✅ Enviar playlists/ordem de culto diretamente
2. ✅ Disparar slides remotamente
3. ✅ Monitorar status em tempo real
4. ✅ Sincronizar com Services LIVE
5. ✅ Controlar timers e mensagens de stage

---

## 5. API do Planning Center

### Visão Geral
API REST unificada seguindo especificação **JSON API 1.0**.

**Fontes**:
- [Planning Center Developers](https://www.planningcenter.com/developers)
- [API Documentation](https://developer.planning.center/docs/)

### Autenticação
- **Personal Access Token**: Para apps próprios (HTTP Basic Auth)
- **OAuth 2.0**: Para apps de terceiros

### Endpoints do Services
```
Base URL: https://api.planningcenteronline.com/services/v2/

/attachment_types
/email_templates
/folders
/media
/people
/report_templates
/series
/service_types
/songs
/tag_groups
/teams
```

### Webhooks Disponíveis
| Evento | Descrição |
|--------|-----------|
| `plan_item.created` | Item adicionado ao plano |
| `plan_item.updated` | Item modificado |
| `plan_item.destroyed` | Item removido |

### Exemplo de Uso
```bash
curl -u application_id:secret \
  https://api.planningcenteronline.com/services/v2/service_types
```

---

## 6. Arquitetura Técnica Proposta

### Stack Recomendada

#### Frontend (Web + PWA)
- **Next.js 15** (App Router)
- **React 18/19**
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **PWA**: `@ducanh2912/next-pwa` ou `Serwist` (recomendados para 2025)

**Fontes PWA**:
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Building Offline-First Next.js PWAs](https://www.getfishtank.com/insights/building-native-like-offline-experience-in-nextjs-pwas)

#### Backend
- **Next.js API Routes** ou **Node.js + Express/Fastify**
- **PostgreSQL** (Neon, Supabase ou self-hosted)
- **Prisma ORM**
- **Redis** (cache e real-time)

#### Autenticação
- **NextAuth.js v5** (Auth.js)
- Suporte a múltiplos roles (Admin, Pastor, Líder, Voluntário)

#### Real-time
- **Socket.io** ou **Pusher** (para Services LIVE)

### Funcionalidades Offline (PWA)
```
┌─────────────────────────────────────────────────────────┐
│                    Camada de Cache                       │
├─────────────────────────────────────────────────────────┤
│  Service Worker  │  IndexedDB  │  Background Sync       │
├─────────────────────────────────────────────────────────┤
│  - Cache de UI   │ - Escalas   │ - Confirmações         │
│  - Assets        │ - Músicas   │ - Atualizações         │
│  - API Responses │ - Planos    │ - Sincronização        │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Módulos do Sistema Contágio e Beta

### 7.1 Gestão de Eventos/Cultos
- Criar eventos (cultos de domingo, especiais)
- Definir data, horário, tipo
- Ordem do culto com timestamps
- Templates reutilizáveis

### 7.2 Escalas de Equipes

#### Equipe Técnica
- Som, Iluminação, Projeção, Transmissão
- Atribuição de posições específicas

#### Equipe Contagie (Cerimonial)
- Recepção, Acolhimento
- Responsáveis por atividades

#### Equipe de Louvor
- Banda: Músicos + Instrumentos
- Backing vocals
- Setlist de músicas
- Tons/Arranjos

#### Pastores
- Pastor da Palavra (pregação)
- Pastor dos Avisos
- Outros (Santa Ceia, Batismo, etc.)

### 7.3 Gestão de Músicas
- Biblioteca de músicas
- Letras e cifras
- Múltiplos arranjos/tons
- Histórico de uso
- Tags categorizadoras

### 7.4 Anexos e Mídia
- Slides de pregação (upload pastor)
- Imagens de avisos (upload comunicação)
- Vídeos
- Apresentações ProPresenter

### 7.5 Integração ProPresenter
- Exportar ordem de culto
- Sincronizar músicas
- Disparar remotamente
- Monitorar status em tempo real

### 7.6 Gestão de Usuários
| Tipo | Permissões |
|------|------------|
| Admin | Acesso total |
| Pastor | Criar eventos, ver escalas |
| Líder de Equipe | Gerenciar sua equipe |
| Comunicação | Upload de mídia/avisos |
| Voluntário | Ver suas escalas, confirmar |

### 7.7 Notificações
- Email automático de escalas
- Push notifications (PWA)
- Lembretes de confirmação
- Alertas de mudanças

---

## 8. Diferenciais vs Planning Center

### Vantagens de um Sistema Próprio

| Aspecto | Planning Center | Contágio e Beta |
|---------|-----------------|------------------|
| Custo | $15-239/mês | Desenvolvimento único |
| Customização | Limitada | Total |
| Idioma | Inglês | Português nativo |
| Contexto | Genérico | Igreja Beta específico |
| Integração PP | Via deles | Direta e customizada |
| Offline | Limitado | PWA completo |
| Hosting | Deles | Seu controle |

### Funcionalidades Exclusivas Possíveis
1. **Contagie específico**: Fluxo de cerimonial brasileiro
2. **Integração direta** com workflow da Igreja Beta
3. **Relatórios customizados** para liderança
4. **Comunicação em português** com voluntários
5. **Regras de negócio específicas** da igreja

---

## 9. Riscos e Considerações

### Técnicos
- ⚠️ API do ProPresenter pode mudar (documentar versões)
- ⚠️ Complexidade de sincronização offline
- ⚠️ Necessidade de manutenção contínua

### Operacionais
- ⚠️ Curva de aprendizado para equipe
- ⚠️ Migração de processos existentes
- ⚠️ Backup e recuperação de dados

### Mitigações
- ✅ Usar abstrações para API do ProPresenter
- ✅ Testes extensivos de sync offline
- ✅ Documentação clara
- ✅ Treinamento da equipe
- ✅ Backups automatizados

---

## 10. Próximos Passos

1. **Validar escopo** - Quais funcionalidades são MVP?
2. **Definir prioridades** - O que é crítico para o lançamento?
3. **Arquitetura detalhada** - Modelagem de dados
4. **Protótipo** - Wireframes/Mockups
5. **Desenvolvimento** - Sprints incrementais
6. **Testes** - Com equipe real da igreja
7. **Deploy** - Infraestrutura e lançamento

---

## Referências

### Planning Center
- [Planning Center](https://www.planningcenter.com/)
- [Planning Center Services](https://www.planningcenter.com/services)
- [Planning Center API Docs](https://developer.planning.center/docs/)
- [Planning Center + ProPresenter](https://www.planningcenter.com/integrations/propresenter)

### ProPresenter
- [ProPresenter](https://www.renewedvision.com/propresenter)
- [ProPresenter Official API](https://openapi.propresenter.com/)
- [ProPresenter API (Community)](https://github.com/jeffmikels/ProPresenter-API)
- [TCP/IP API Docs](https://support.renewedvision.com/hc/en-us/articles/31606866768147-TCP-IP-Connections-with-ProPresenter-API)

### PWA e Tecnologias
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Offline-First PWAs](https://www.getfishtank.com/insights/building-native-like-offline-experience-in-nextjs-pwas)
- [PWA + Next.js 15 (2025)](https://medium.com/@mernstackdevbykevin/progressive-web-app-next-js-15-16-react-server-components-is-it-still-relevant-in-2025-4dff01d32a5d)
