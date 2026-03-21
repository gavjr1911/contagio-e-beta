# Plano de Desenvolvimento - Sistema Contágio e Beta

## Visão Geral do Plano

### Metodologia
- **Abordagem**: Desenvolvimento em fases com entregas incrementais
- **Paralelização**: Uso de Team Agents especializados trabalhando simultaneamente
- **Qualidade**: Segurança, testes e performance desde o início (shift-left)

### Team Agents

| Agent | Responsabilidade |
|-------|------------------|
| **Core Backend** | APIs, banco de dados, regras de negócio |
| **Frontend UI** | Interfaces, componentes, UX |
| **Integration** | ProPresenter, email, calendário |
| **Security** | Autenticação, autorização, auditoria |
| **QA/Testing** | Testes unitários, integração, E2E |
| **DevOps** | CI/CD, infraestrutura, monitoramento |

### Design System (Identidade Visual Beta)

O sistema segue a identidade visual oficial da Igreja Beta. Consulte `docs/DESIGN_SYSTEM.md` para detalhes completos.

#### Paleta de Cores
| Cor | Hex | Uso |
|-----|-----|-----|
| Preto | `#1B1B1B` | Background principal |
| Navy | `#3B5562` | Cards, backgrounds secundários |
| Creme | `#F5E7D7` | Textos, backgrounds claros |
| Terracota | `#BF531A` | Acentos, botões, CTAs |
| Cinza Azulado | `#C5CACD` | Textos secundários, bordas |

#### Tipografia
| Uso | Fonte | Alternativa Web |
|-----|-------|-----------------|
| Títulos (H1) | Neue Haas Display | Inter |
| Subtítulos (H2/H3) | PP Fragment Text Bold | DM Sans |
| Body | Neue Haas Text | Inter |

#### Diretrizes Visuais
- **Modo padrão**: Dark mode (alinhado com identidade Beta)
- **Logo**: "Beta" com "t" estilizado como cruz
- **Ícones**: Lucide Icons (24px, stroke 2px)
- **Border radius**: 16px para cards, 8px para botões
- **Animações**: 200ms ease-in-out

---

## Fase 0 - Setup e Fundação (Sprint 0)

### Objetivo
Configurar toda a infraestrutura base para desenvolvimento paralelo.

### Tarefas Paralelas

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SPRINT 0 - SETUP                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ Core Backend│  │ Frontend UI │  │   DevOps    │                 │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤                 │
│  │ - Prisma    │  │ - Next.js   │  │ - GitHub    │                 │
│  │ - Schema    │  │ - Tailwind  │  │ - Vercel    │                 │
│  │ - Migrations│  │ - shadcn/ui │  │ - CI/CD     │                 │
│  │ - Seeds     │  │ - PWA setup │  │ - Env vars  │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          ▼                                          │
│                   ┌─────────────┐                                   │
│                   │  Security   │                                   │
│                   ├─────────────┤                                   │
│                   │ - Auth.js   │                                   │
│                   │ - RBAC base │                                   │
│                   │ - Middleware│                                   │
│                   └─────────────┘                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 0.1 Core Backend Agent
- [ ] Inicializar projeto Next.js 15 com App Router
- [ ] Configurar TypeScript com strict mode
- [ ] Setup Prisma ORM
- [ ] Criar schema inicial completo (todas as entidades)
- [ ] Configurar conexão PostgreSQL (Neon/Supabase)
- [ ] Criar migrations iniciais
- [ ] Criar seeds para dados de desenvolvimento
- [ ] Configurar variáveis de ambiente (.env.example)

### 0.2 Frontend UI Agent
- [ ] Configurar Tailwind CSS com cores Beta (ver DESIGN_SYSTEM.md)
  - [ ] Paleta: black (#1B1B1B), navy (#3B5562), cream (#F5E7D7), terracotta (#BF531A), gray-blue (#C5CACD)
- [ ] Instalar e configurar shadcn/ui com tema Beta
- [ ] Configurar fontes (Inter + DM Sans via Google Fonts)
- [ ] Criar sistema de design tokens (cores, espaçamentos, tipografia)
- [ ] Configurar PWA (manifest.json, service worker base)
  - [ ] Ícones com logo Beta (cruz estilizada)
  - [ ] Cores do tema no manifest
- [ ] Criar layout base (sidebar, header, navigation)
  - [ ] Sidebar: Navy (#3B5562)
  - [ ] Header com logo Beta
- [ ] Configurar tema dark mode como padrão
- [ ] Setup de ícones (Lucide)
- [ ] Criar componentes base alinhados com IDV:
  - [ ] Button (primary terracotta, secondary outline)
  - [ ] Card (background navy, border radius 16px)
  - [ ] Input (focus ring terracotta)
  - [ ] Badge (status: confirmado, pendente, recusado)

### 0.3 DevOps Agent
- [ ] Criar repositório GitHub com branch protection
- [ ] Configurar Vercel project
- [ ] Setup CI/CD (GitHub Actions)
  - [ ] Lint + Type check
  - [ ] Testes automatizados
  - [ ] Preview deployments
  - [ ] Production deployment
- [ ] Configurar ambientes (dev, staging, production)
- [ ] Setup de variáveis de ambiente no Vercel
- [ ] Configurar domínio (se houver)

### 0.4 Security Agent
- [ ] Configurar Auth.js v5 (NextAuth)
- [ ] Setup de providers (credentials + magic link)
- [ ] Criar middleware de autenticação
- [ ] Implementar RBAC (Role-Based Access Control) base
- [ ] Configurar CORS e headers de segurança
- [ ] Setup de rate limiting base
- [ ] Configurar HTTPS e cookies seguros

### 0.5 QA Agent
- [ ] Configurar Vitest para testes unitários
- [ ] Configurar Playwright para testes E2E
- [ ] Criar estrutura de testes (__tests__, e2e/)
- [ ] Configurar coverage reports
- [ ] Criar fixtures e factories de teste
- [ ] Setup de testes de API

### Entregáveis Sprint 0
- [ ] Projeto rodando localmente
- [ ] Deploy funcionando no Vercel (mesmo que vazio)
- [ ] CI/CD executando em PRs
- [ ] Banco de dados criado e conectado
- [ ] Autenticação básica funcionando

---

## Fase 1 - MVP: Sistema de Escalas

### Objetivo
Sistema funcional para criar eventos, escalar voluntários e confirmar participação.

### Sprint 1.1 - Usuários e Ministérios

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SPRINT 1.1 - USUÁRIOS E MINISTÉRIOS              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │Core Backend │  │ Frontend UI │  │  Security   │  │ QA/Testing│  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ API Users   │  │ Tela Login  │  │ Permissões  │  │ Testes    │  │
│  │ API Minist. │  │ Dashboard   │  │ por papel   │  │ unitários │  │
│  │ API Membros │  │ CRUD Minist.│  │ Auditoria   │  │ Testes E2E│  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Core Backend
- [ ] API: CRUD de usuários
- [ ] API: CRUD de ministérios
- [ ] API: CRUD de membros de ministério
- [ ] API: Listar membros por ministério
- [ ] API: Atribuir/remover líder de ministério
- [ ] Validações com Zod
- [ ] Error handling padronizado

#### Frontend UI
- [ ] Página de login (email + magic link)
- [ ] Dashboard principal (por papel)
- [ ] Página de perfil do usuário
- [ ] Listagem de ministérios
- [ ] Tela de detalhes do ministério
- [ ] CRUD de membros do ministério
- [ ] Componentes: Card, Table, Modal, Form

#### Security
- [ ] Implementar permissões por papel (Admin, Líder, Voluntário)
- [ ] Proteger rotas por papel
- [ ] Auditoria de ações (log de mudanças)
- [ ] Validação de sessão em todas as APIs
- [ ] Sanitização de inputs

#### QA/Testing
- [ ] Testes unitários das APIs de usuário
- [ ] Testes unitários das APIs de ministério
- [ ] Testes E2E: fluxo de login
- [ ] Testes E2E: CRUD de ministério
- [ ] Testes de permissão (acesso negado)

### Sprint 1.2 - Eventos e Escalas

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SPRINT 1.2 - EVENTOS E ESCALAS                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │Core Backend │  │ Frontend UI │  │ Integration │  │ QA/Testing│  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ API Eventos │  │ CRUD Evento │  │ Email setup │  │ Testes    │  │
│  │ API Escalas │  │ Tela Escala │  │ Templates   │  │ de escala │  │
│  │ Workflow    │  │ Calendário  │  │ Envio email │  │ E2E flow  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Core Backend
- [ ] API: CRUD de eventos
- [ ] API: CRUD de tipos de evento
- [ ] API: Templates de evento
- [ ] API: CRUD de escalas
- [ ] API: Escalar voluntário
- [ ] API: Confirmar/recusar escala
- [ ] API: Listar escalas por evento
- [ ] API: Listar escalas por usuário
- [ ] API: Verificar conflitos de escala
- [ ] Workflow de status (pendente → confirmado/recusado)

#### Frontend UI
- [ ] Página de listagem de eventos
- [ ] Página de criação de evento
- [ ] Página de detalhes do evento
- [ ] Interface de escala (arrastar membros)
- [ ] Visualização de escala por ministério
- [ ] Calendário de eventos
- [ ] "Minhas escalas" para voluntário
- [ ] Botões de confirmar/recusar
- [ ] Indicadores de status (pendente, confirmado, recusado)

#### Integration Agent
- [ ] Configurar serviço de email (Resend)
- [ ] Criar templates de email (HTML responsivo)
  - [ ] Convite para escala
  - [ ] Lembrete de escala
  - [ ] Confirmação recebida
  - [ ] Notificação de mudança
- [ ] Implementar envio de email ao escalar
- [ ] Implementar lembretes automáticos (cron/Vercel)
- [ ] Links de confirmação por email (magic link)

#### QA/Testing
- [ ] Testes unitários de eventos
- [ ] Testes unitários de escalas
- [ ] Testes de workflow de confirmação
- [ ] Testes E2E: criar evento e escalar
- [ ] Testes E2E: confirmar/recusar escala
- [ ] Testes de envio de email (mock)

### Sprint 1.3 - PWA e Offline

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SPRINT 1.3 - PWA E OFFLINE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │ Frontend UI │  │   DevOps    │  │  Security   │  │ QA/Testing│  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ SW avançado │  │ Cache rules │  │ SW security │  │ Testes    │  │
│  │ IndexedDB   │  │ Manifest    │  │ Token cache │  │ offline   │  │
│  │ Sync queue  │  │ Icons/splash│  │ Validação   │  │ PWA tests │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Frontend UI
- [ ] Implementar Service Worker completo (Serwist)
- [ ] Cache de assets estáticos
- [ ] Cache de dados das escalas do usuário
- [ ] Implementar IndexedDB para dados offline
- [ ] UI de indicador offline/online
- [ ] Queue de ações offline (confirmar escala)
- [ ] Sincronização ao voltar online
- [ ] Tela de fallback offline

#### DevOps
- [ ] Configurar estratégias de cache
- [ ] Otimizar manifest.json
- [ ] Criar ícones em todos os tamanhos
- [ ] Splash screens
- [ ] Configurar headers de cache
- [ ] Testar em diferentes dispositivos

#### Security
- [ ] Segurança do Service Worker
- [ ] Cache seguro de tokens
- [ ] Validação de dados offline
- [ ] Limpeza de cache em logout

#### QA/Testing
- [ ] Testes de funcionamento offline
- [ ] Testes de sincronização
- [ ] Testes de instalação PWA
- [ ] Lighthouse PWA audit

### Entregáveis Fase 1 (MVP)
- [ ] Sistema de login funcionando
- [ ] CRUD completo de ministérios e membros
- [ ] CRUD completo de eventos
- [ ] Sistema de escalas com confirmação
- [ ] Emails sendo enviados
- [ ] PWA instalável com escalas offline
- [ ] Cobertura de testes > 70%

---

## Fase 2 - Louvor e Músicas

### Sprint 2.1 - Músicas e Biblioteca

```
┌─────────────────────────────────────────────────────────────────────┐
│                   SPRINT 2.1 - MÚSICAS E BIBLIOTECA                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │Core Backend │  │ Frontend UI │  │ Integration │  │ QA/Testing│  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ API Músicas │  │ Biblioteca  │  │ ProPresenter│  │ Testes    │  │
│  │ API Tags    │  │ Busca       │  │ Sync música │  │ integração│  │
│  │ Histórico   │  │ Detalhes    │  │ Import      │  │ E2E       │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Core Backend
- [ ] API: CRUD de músicas
- [ ] API: CRUD de tags de música
- [ ] API: Busca de músicas (nome, artista, tag)
- [ ] API: Histórico de uso de músicas
- [ ] API: Estatísticas de músicas (mais tocadas, última vez)
- [ ] API: Import de músicas (JSON/CSV)

#### Frontend UI
- [ ] Página de biblioteca de músicas
- [ ] Busca e filtros de músicas
- [ ] Página de detalhes da música
- [ ] Editor de música (nome, artista, tom, link cifra)
- [ ] Visualização de letra
- [ ] Tags e categorização
- [ ] Indicador de última vez tocada

#### Integration Agent
- [ ] Pesquisar API do ProPresenter para biblioteca
- [ ] Implementar conexão com ProPresenter
- [ ] Importar músicas do ProPresenter
- [ ] Sincronizar letras
- [ ] Mapeamento de IDs (sistema ↔ ProPresenter)
- [ ] Sync manual e automático

#### QA/Testing
- [ ] Testes de CRUD de músicas
- [ ] Testes de busca e filtros
- [ ] Testes de integração ProPresenter (mock)
- [ ] Testes E2E de biblioteca

### Sprint 2.2 - Bandas e Setlist

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SPRINT 2.2 - BANDAS E SETLIST                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │Core Backend │  │ Frontend UI │  │ Integration │  │ QA/Testing│  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ API Bandas  │  │ CRUD Bandas │  │ Export PP   │  │ Testes    │  │
│  │ API Setlist │  │ Setlist UI  │  │ Playlist    │  │ setlist   │  │
│  │ Tons        │  │ Drag/drop   │  │ Sync        │  │ E2E       │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Core Backend
- [ ] API: CRUD de bandas
- [ ] API: CRUD de membros de banda (com instrumento)
- [ ] API: CRUD de setlist
- [ ] API: Adicionar/remover música do setlist
- [ ] API: Reordenar setlist
- [ ] API: Definir tom por música no setlist
- [ ] API: Copiar setlist de outro evento

#### Frontend UI
- [ ] Página de listagem de bandas
- [ ] CRUD de banda com formação
- [ ] Seletor de banda ao escalar louvor
- [ ] Interface de setlist (drag and drop)
- [ ] Seletor de tom por música
- [ ] Preview do setlist
- [ ] Visualização para músico (seu setlist + letras)

#### Integration Agent
- [ ] Exportar setlist como playlist ProPresenter
- [ ] Enviar playlist via API
- [ ] Vincular músicas do setlist com ProPresenter
- [ ] Notificar músicos sobre setlist (email)

#### QA/Testing
- [ ] Testes de CRUD de bandas
- [ ] Testes de setlist
- [ ] Testes de reordenação
- [ ] Testes de export para ProPresenter
- [ ] Testes E2E de fluxo completo

### Entregáveis Fase 2
- [ ] Biblioteca de músicas funcionando
- [ ] Sincronização com ProPresenter
- [ ] CRUD de bandas
- [ ] Setlist por evento com tons
- [ ] Export de playlist para ProPresenter
- [ ] Visualização do músico

---

## Fase 3 - Comunicação e Mídia

### Sprint 3.1 - Upload e Gestão de Mídia

```
┌─────────────────────────────────────────────────────────────────────┐
│                  SPRINT 3.1 - UPLOAD E GESTÃO DE MÍDIA              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │Core Backend │  │ Frontend UI │  │   DevOps    │  │  Security │  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ API Upload  │  │ Dropzone    │  │ Storage     │  │ Validação │  │
│  │ API Mídia   │  │ Galeria     │  │ CDN         │  │ Sanitize  │  │
│  │ Categorias  │  │ Preview     │  │ Compress    │  │ Limite    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Core Backend
- [ ] API: Upload de arquivos (presigned URLs)
- [ ] API: CRUD de mídia
- [ ] API: Categorização de mídia
- [ ] API: Associar mídia a evento
- [ ] API: Listar mídia por evento
- [ ] Suporte a: imagens, vídeos, PDFs, PPT

#### Frontend UI
- [ ] Componente de upload (drag and drop)
- [ ] Preview de arquivos
- [ ] Galeria de mídia do evento
- [ ] Filtros por tipo/categoria
- [ ] Player de vídeo inline
- [ ] Visualizador de PDF
- [ ] Progresso de upload

#### DevOps
- [ ] Configurar storage (Vercel Blob ou S3)
- [ ] Configurar CDN para mídia
- [ ] Compressão automática de imagens
- [ ] Limites de tamanho de arquivo
- [ ] Cleanup de arquivos órfãos

#### Security
- [ ] Validação de tipo de arquivo
- [ ] Sanitização de nomes de arquivo
- [ ] Scan de vírus (opcional)
- [ ] Limites por usuário
- [ ] Auditoria de uploads

### Sprint 3.2 - Integração de Mídia com ProPresenter

```
┌─────────────────────────────────────────────────────────────────────┐
│               SPRINT 3.2 - MÍDIA + PROPRESENTER                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │ Integration │  │ Frontend UI │  │Core Backend │  │ QA/Testing│  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ Send to PP  │  │ Seletor     │  │ Conversões  │  │ Testes    │  │
│  │ Organize    │  │ Ordem       │  │ Formatos    │  │ integração│  │
│  │ Sync status │  │ Feedback    │  │ Queue       │  │ E2E       │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Integration Agent
- [ ] Enviar mídia para biblioteca do ProPresenter
- [ ] Organizar mídia em pastas por evento
- [ ] Incluir mídia na playlist do evento
- [ ] Sincronizar status (enviado/pendente)
- [ ] Retry automático em falhas

#### Frontend UI
- [ ] Seletor de mídia para ordem do culto
- [ ] Ordenação de mídia nos avisos
- [ ] Status de sincronização com ProPresenter
- [ ] Feedback visual de envio
- [ ] Preview antes de enviar

#### Core Backend
- [ ] Conversão de formatos se necessário
- [ ] Queue de processamento de mídia
- [ ] Status de processamento
- [ ] Cleanup após evento

### Entregáveis Fase 3
- [ ] Upload de mídia funcionando
- [ ] Galeria organizada por evento
- [ ] Envio automático para ProPresenter
- [ ] Diferentes tipos de arquivo suportados

---

## Fase 4 - Ordem do Culto e Coordenação

### Sprint 4.1 - Editor de Ordem do Culto

```
┌─────────────────────────────────────────────────────────────────────┐
│                 SPRINT 4.1 - ORDEM DO CULTO                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │Core Backend │  │ Frontend UI │  │ Integration │  │ QA/Testing│  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ API Ordem   │  │ Editor      │  │ Sync PP     │  │ Testes    │  │
│  │ Templates   │  │ Timeline    │  │ Playlist    │  │ templates │  │
│  │ Timestamps  │  │ Drag/drop   │  │ Real-time   │  │ E2E       │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Core Backend
- [ ] API: CRUD de itens da ordem do culto
- [ ] API: Tipos de item (louvor, pregação, avisos, etc)
- [ ] API: Reordenação de itens
- [ ] API: Cálculo automático de timestamps
- [ ] API: Templates de ordem do culto
- [ ] API: Aplicar template a evento
- [ ] API: Duplicar ordem de outro evento

#### Frontend UI
- [ ] Editor de ordem do culto (drag and drop)
- [ ] Adicionar diferentes tipos de item
- [ ] Definir duração estimada
- [ ] Timeline visual com horários
- [ ] Associar responsável a cada item
- [ ] Associar mídia/setlist a item
- [ ] Preview da ordem completa
- [ ] Gestão de templates

#### Integration Agent
- [ ] Gerar playlist completa do culto
- [ ] Incluir músicas + mídia na ordem correta
- [ ] Enviar para ProPresenter
- [ ] Atualizar ProPresenter em mudanças

### Sprint 4.2 - Dashboard Contagiê e Services LIVE

```
┌─────────────────────────────────────────────────────────────────────┐
│              SPRINT 4.2 - DASHBOARD E SERVICES LIVE                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │Core Backend │  │ Frontend UI │  │ Integration │  │   DevOps  │  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ WebSocket   │  │ Dashboard   │  │ PP status   │  │ WebSocket │  │
│  │ Events      │  │ Live view   │  │ Services    │  │ infra     │  │
│  │ Real-time   │  │ Controls    │  │ LIVE        │  │ Scale     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Core Backend
- [ ] Implementar WebSocket (Socket.io ou Pusher)
- [ ] Eventos real-time de status do culto
- [ ] API: Marcar item como "em andamento"
- [ ] API: Avançar para próximo item
- [ ] Broadcast de mudanças

#### Frontend UI
- [ ] Dashboard do Contagiê (visão geral)
- [ ] Visualização de todas as escalas
- [ ] Indicadores de confirmação por ministério
- [ ] Timeline LIVE do culto
- [ ] Marcar item atual
- [ ] Visualização para todos (item atual)
- [ ] Controles de avançar/voltar item

#### Integration Agent
- [ ] Conectar com ProPresenter para status de slide
- [ ] Sincronizar item atual com slide atual
- [ ] Services LIVE: mostrar no stage display
- [ ] Feedback visual no sistema

#### DevOps
- [ ] Configurar infraestrutura WebSocket
- [ ] Escalar conexões simultâneas
- [ ] Monitoramento de conexões

### Entregáveis Fase 4
- [ ] Editor de ordem do culto completo
- [ ] Templates de culto
- [ ] Dashboard do Contagiê
- [ ] Services LIVE funcionando
- [ ] Real-time com WebSocket

---

## Fase 5 - Relatórios e Refinamentos

### Sprint 5.1 - Relatórios

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SPRINT 5.1 - RELATÓRIOS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │Core Backend │  │ Frontend UI │  │   DevOps    │  │ QA/Testing│  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ Queries     │  │ Dashboard   │  │ Cache       │  │ Testes    │  │
│  │ Aggregation │  │ Charts      │  │ Jobs        │  │ relatórios│  │
│  │ Export      │  │ Filtros     │  │ Performance │  │ E2E       │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Core Backend
- [ ] API: Relatório de frequência de voluntários
- [ ] API: Relatório de músicas (ranking, última vez)
- [ ] API: Histórico de cultos
- [ ] API: Exportar relatórios (CSV, PDF)
- [ ] Aggregations otimizadas
- [ ] Cache de relatórios pesados

#### Frontend UI
- [ ] Dashboard de relatórios
- [ ] Gráficos de frequência (charts)
- [ ] Ranking de músicas
- [ ] Filtros por período
- [ ] Histórico de cultos navegável
- [ ] Export de relatórios

#### DevOps
- [ ] Configurar cache para relatórios
- [ ] Jobs de pré-processamento
- [ ] Otimização de queries pesadas

### Sprint 5.2 - Performance e Escalabilidade

```
┌─────────────────────────────────────────────────────────────────────┐
│              SPRINT 5.2 - PERFORMANCE E ESCALABILIDADE              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │Core Backend │  │ Frontend UI │  │   DevOps    │  │  Security │  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ Query optim │  │ Bundle size │  │ Monitoring  │  │ Audit     │  │
│  │ Indexes     │  │ Lazy load   │  │ Alerts      │  │ Pentest   │  │
│  │ Cache       │  │ Images      │  │ Logs        │  │ OWASP     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Core Backend
- [ ] Análise e otimização de queries
- [ ] Criar índices necessários
- [ ] Implementar cache (Redis ou in-memory)
- [ ] Paginação em todas as listagens
- [ ] Compressão de responses

#### Frontend UI
- [ ] Análise de bundle size
- [ ] Code splitting agressivo
- [ ] Lazy loading de componentes
- [ ] Otimização de imagens (next/image)
- [ ] Prefetch de rotas importantes
- [ ] Lighthouse score > 90

#### DevOps
- [ ] Configurar monitoramento (Vercel Analytics)
- [ ] Alertas de erro
- [ ] Logs estruturados
- [ ] Dashboard de métricas
- [ ] Load testing

#### Security
- [ ] Security audit completo
- [ ] Verificação OWASP Top 10
- [ ] Teste de penetração básico
- [ ] Revisão de permissões
- [ ] Documentação de segurança

### Entregáveis Fase 5
- [ ] Relatórios completos funcionando
- [ ] Performance otimizada
- [ ] Monitoramento configurado
- [ ] Security audit aprovado
- [ ] Documentação completa

---

## Fase 6 - Controle Remoto ProPresenter (Avançado)

### Sprint 6.1 - Controle Remoto

```
┌─────────────────────────────────────────────────────────────────────┐
│                 SPRINT 6.1 - CONTROLE REMOTO PP                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │ Integration │  │ Frontend UI │  │  Security   │  │ QA/Testing│  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├───────────┤  │
│  │ PP API full │  │ Remote ctrl │  │ Auth PP     │  │ Testes    │  │
│  │ WebSocket   │  │ Slide view  │  │ Permissions │  │ remoto    │  │
│  │ Bidirection │  │ Thumbnails  │  │ Audit       │  │ E2E       │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Integration Agent
- [ ] Conexão WebSocket com ProPresenter
- [ ] Receber status de slide atual
- [ ] Receber thumbnails de slides
- [ ] Comandos: próximo slide, anterior, ir para slide
- [ ] Comandos: disparar playlist
- [ ] Comandos: controlar timer
- [ ] Conexão estável com reconexão automática

#### Frontend UI
- [ ] Interface de controle remoto
- [ ] Visualização de slide atual
- [ ] Preview do próximo slide
- [ ] Botões de controle (anterior, próximo)
- [ ] Lista de slides com thumbnails
- [ ] Indicador de conexão com ProPresenter

#### Security
- [ ] Autenticação específica para controle
- [ ] Permissões granulares (quem pode controlar)
- [ ] Log de todas as ações de controle
- [ ] Rate limiting de comandos

### Entregáveis Fase 6
- [ ] Controle remoto do ProPresenter funcionando
- [ ] Visualização de slides em tempo real
- [ ] Integração bidirecional completa

---

## Requisitos de Segurança (Transversal)

### Autenticação e Autorização
- [ ] Auth.js v5 com sessões seguras
- [ ] Magic link como alternativa a senha
- [ ] Refresh token rotation
- [ ] RBAC implementado em todas as rotas
- [ ] Logout em todos os dispositivos

### Proteção de Dados
- [ ] HTTPS obrigatório
- [ ] Cookies httpOnly e secure
- [ ] CSRF protection
- [ ] XSS prevention
- [ ] SQL injection prevention (Prisma)
- [ ] Rate limiting em APIs sensíveis

### Auditoria
- [ ] Log de todas as ações importantes
- [ ] Quem fez, o quê, quando
- [ ] Retenção de logs (90 dias)
- [ ] Acesso a logs apenas para admin

### Compliance
- [ ] Termos de uso
- [ ] Política de privacidade
- [ ] Possibilidade de exportar dados do usuário
- [ ] Possibilidade de deletar conta

---

## Requisitos de Testes (Transversal)

### Cobertura Mínima
| Tipo | Cobertura |
|------|-----------|
| Unitários | > 70% |
| Integração | > 50% |
| E2E | Fluxos críticos |

### Testes Obrigatórios por Feature
- [ ] Testes unitários de todas as APIs
- [ ] Testes de validação de inputs
- [ ] Testes de permissões
- [ ] Testes E2E dos fluxos principais
- [ ] Testes de regressão

### CI/CD
- [ ] Testes rodam em todo PR
- [ ] PR bloqueado se testes falharem
- [ ] Coverage report em PRs
- [ ] Testes E2E em staging antes de prod

---

## Requisitos de Performance (Transversal)

### Métricas Alvo
| Métrica | Alvo |
|---------|------|
| LCP (Largest Contentful Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| TTFB (Time to First Byte) | < 600ms |
| Lighthouse Score | > 90 |

### Otimizações
- [ ] Server-side rendering onde apropriado
- [ ] Static generation para páginas estáticas
- [ ] Image optimization
- [ ] Font optimization
- [ ] Code splitting
- [ ] Cache headers corretos
- [ ] Gzip/Brotli compression

### Monitoramento
- [ ] Real User Monitoring (RUM)
- [ ] Error tracking (Sentry)
- [ ] Performance dashboards
- [ ] Alertas de degradação

---

## Requisitos de Escalabilidade

### Dimensionamento
| Recurso | Capacidade Inicial | Escalável até |
|---------|-------------------|---------------|
| Usuários simultâneos | 50 | 500 |
| Eventos por mês | 30 | 300 |
| Arquivos de mídia | 10GB | 100GB |
| Requisições/min | 1000 | 10000 |

### Arquitetura
- [ ] Banco de dados com connection pooling
- [ ] CDN para assets estáticos
- [ ] Cache em múltiplas camadas
- [ ] Stateless APIs (escaláveis horizontalmente)
- [ ] Queue para processamentos pesados

### Plano de Contingência
- [ ] Backup automático diário
- [ ] Point-in-time recovery
- [ ] Runbook de incidentes
- [ ] Contato de emergência

---

## Cronograma Resumido

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CRONOGRAMA DE FASES                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Fase 0 ████                                                        │
│  Setup   (1-2 sprints)                                              │
│                                                                     │
│  Fase 1 ████████████                                                │
│  MVP     (3-4 sprints)                                              │
│                                                                     │
│  Fase 2 ████████                                                    │
│  Louvor  (2-3 sprints)                                              │
│                                                                     │
│  Fase 3 ██████                                                      │
│  Mídia   (2 sprints)                                                │
│                                                                     │
│  Fase 4 ████████                                                    │
│  Coord.  (2-3 sprints)                                              │
│                                                                     │
│  Fase 5 ██████                                                      │
│  Relat.  (2 sprints)                                                │
│                                                                     │
│  Fase 6 ████                                                        │
│  PP Ctrl (1-2 sprints)                                              │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  Total estimado: 13-18 sprints                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Go-Live

### Pré-requisitos
- [ ] Todas as features do MVP implementadas
- [ ] Testes passando (coverage > 70%)
- [ ] Security audit aprovado
- [ ] Performance dentro das métricas
- [ ] Documentação completa
- [ ] Treinamento da equipe

### Deploy
- [ ] Backup do ambiente anterior (se houver)
- [ ] Deploy em staging para validação final
- [ ] Smoke tests em staging
- [ ] Deploy em produção
- [ ] Smoke tests em produção
- [ ] Monitoramento ativo

### Pós-deploy
- [ ] Comunicar usuários
- [ ] Suporte intensivo primeiras semanas
- [ ] Coletar feedback
- [ ] Ajustes rápidos se necessário

---

*Documento criado em: Março/2026*
*Versão: 1.0*
