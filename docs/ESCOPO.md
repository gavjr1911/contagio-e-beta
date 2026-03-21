# Escopo do Projeto - Sistema Contágio e Beta

## 1. Visão Geral

### Objetivo
Sistema de gestão de operações de eventos para a Igreja Beta, com foco em coordenação de escalas de ministérios, gestão de cultos e integração direta com ProPresenter.

### Contexto
- **Igreja**: Igreja Beta (evangélica)
- **Voluntários ativos**: 30-80 pessoas
- **Eventos principais**: Cultos de domingo (manhã e noite) + eventos especiais
- **Prazo**: Sem pressa - desenvolvimento completo e bem feito

---

## 2. Estrutura Organizacional

### Contagiê (Coordenação Central)
O ministério Contagiê é o **coordenador geral** dos eventos. Não executa, mas:
- Coordena todas as equipes/ministérios
- Garante execução correta do cronograma do culto
- Tem visão geral de todas as escalas
- Acompanha o andamento do evento em tempo real

### Ministérios (Equipes)

Cada ministério tem sua própria liderança que gerencia suas escalas:

| Ministério | Responsabilidade | Posições |
|------------|------------------|----------|
| **Recepção** | Porta, acolhimento, visitantes | Recepcionistas |
| **Pastores** | Pregação, avisos, liturgia | Pastor da Palavra, Pastor dos Avisos, outros |
| **Técnica** | Operação de equipamentos | Mesa de Som, Iluminação, Projeção |
| **Louvor** | Música e adoração | Vocal, Instrumentistas (por instrumento) |
| **Comunicação** | Artes e mídia | Designers (upload de conteúdo) |

### Hierarquia de Usuários

| Papel | Permissões |
|-------|------------|
| **Admin** | Acesso total, configurações do sistema |
| **Contagiê (Coordenador)** | Visualiza todas as escalas, coordena evento |
| **Líder de Ministério** | Gerencia escala do seu ministério |
| **Comunicação** | Upload de mídia/avisos para cultos |
| **Voluntário** | Visualiza suas escalas, confirma/recusa |

---

## 3. Funcionalidades do Sistema

### 3.1 Gestão de Eventos/Cultos

#### Criar Evento
- Nome do evento
- Tipo (Culto Domingo Manhã, Culto Domingo Noite, Especial, etc.)
- Data e horário
- Local (se aplicável)

#### Ordem do Culto (Cronograma)
- Lista ordenada de itens com:
  - Tipo (Louvor, Avisos, Pregação, Santa Ceia, etc.)
  - Descrição
  - Duração estimada
  - Responsável
- Timestamps automáticos baseados na duração
- Possibilidade de arrastar/reordenar itens

#### Templates de Culto
- Salvar estrutura de culto como template
- Aplicar template ao criar novo evento
- Templates separados por tipo de culto

### 3.2 Gestão de Escalas

#### Para Líderes de Ministério
- Visualizar membros disponíveis da equipe
- Escalar pessoas para o evento
- Ver conflitos (pessoa já escalada em outro ministério)
- Receber notificação de confirmação/recusa
- Realocar quando alguém recusa

#### Para Voluntários
- Ver suas escalas futuras
- **Confirmar** participação
- **Recusar** com justificativa (opcional)
- Marcar datas de indisponibilidade (férias, viagem, etc.)
- Sincronizar com calendário pessoal (iCal/Google Calendar)

#### Workflow de Confirmação
```
Líder escala voluntário
        ↓
Sistema envia email para voluntário
        ↓
Voluntário acessa sistema
        ↓
    ┌───────┴───────┐
    ↓               ↓
Confirma         Recusa
    ↓               ↓
Status atualiza   Líder notificado
                    ↓
              Líder realoca
```

### 3.3 Gestão de Louvor

#### Bandas
- Cadastrar bandas base (ex: Banda A, Banda B)
- Definir formação padrão de cada banda
- Ao escalar banda, traz formação automaticamente
- Permitir trocar músicos individualmente quando necessário

#### Instrumentos/Posições
- Vocal (líder, backing)
- Violão
- Guitarra
- Baixo
- Bateria
- Teclado
- Outros (customizável)

#### Setlist
- Selecionar músicas para o culto
- Definir tom de cada música
- Ordenar músicas
- **Sincronizar com biblioteca do ProPresenter**

### 3.4 Gestão de Músicas

#### Biblioteca
- **Fonte principal**: Sincronização com ProPresenter
- Sistema importa músicas cadastradas no ProPresenter
- Mantém letras sincronizadas

#### Complementos no Sistema
- Link para cifra (Cifra Club, etc.)
- Tom padrão e tons alternativos
- Tags (rápida, lenta, comunhão, adoração, etc.)
- Última vez tocada
- Frequência de uso

#### Acesso para Músicos
- Ver setlist do culto que vai tocar
- Acessar letra de cada música
- Link direto para cifra
- Tom definido para o culto

### 3.5 Gestão de Mídia/Comunicação

#### Upload de Conteúdo
- Imagens (PNG, JPG)
- Vídeos (MP4)
- Apresentações (PPT, PDF)
- Associar ao evento/culto específico

#### Organização
- Categorizar por tipo (Avisos, Pregação, Especial)
- Vincular ao item da ordem do culto
- Enviar para o ProPresenter via integração

### 3.6 Integração ProPresenter

#### Sincronização de Biblioteca
- Importar músicas do ProPresenter
- Manter letras atualizadas
- Sincronização periódica ou manual

#### Exportar para ProPresenter
- Gerar playlist do culto
- Incluir músicas na ordem do setlist
- Incluir mídia de avisos
- Enviar via API diretamente para o ProPresenter

#### Controle Remoto (Fase 2)
- Monitorar slide atual
- Avançar/voltar slides remotamente
- Visualizar próximo item
- Integrar com Services LIVE (mostrar item atual)

### 3.7 Notificações

#### Email
- Convite para escala (novo agendamento)
- Lembrete de escala (X dias antes)
- Confirmação de recebimento
- Alterações no evento/escala
- Mudanças no setlist (para músicos)

#### Sistema (PWA)
- Badge de notificações pendentes
- Listagem de notificações
- Marcar como lido

### 3.8 Relatórios

#### Frequência de Voluntários
- Quantas vezes cada pessoa serviu (por período)
- Taxa de confirmação/recusa
- Voluntários mais/menos escalados
- Ausências

#### Músicas
- Ranking de músicas mais tocadas
- Última vez que cada música foi tocada
- Distribuição por tags/categorias
- Evitar repetição excessiva

#### Histórico de Cultos
- Arquivo completo de cultos passados
- Ordem do culto
- Escalas
- Setlist
- Mídia utilizada

### 3.9 PWA e Offline

#### Instalação
- Instalável como app no celular
- Ícone na tela inicial
- Funciona como app nativo

#### Funcionalidades Offline
- **Escalas**: Ver minhas escalas mesmo sem internet
- Cache automático das escalas do usuário
- Sincronização quando voltar online

---

## 4. Requisitos Técnicos

### Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Next.js 15 (App Router) + React 19 + TypeScript |
| **Estilização** | Tailwind CSS + shadcn/ui |
| **PWA** | Serwist ou @ducanh2912/next-pwa |
| **Backend** | Next.js API Routes (Server Actions) |
| **Banco de Dados** | PostgreSQL (Neon ou Supabase) |
| **ORM** | Prisma |
| **Autenticação** | Auth.js v5 (NextAuth) |
| **Email** | Resend ou SendGrid |
| **Hospedagem** | Vercel |

### Integrações Externas

| Serviço | Propósito |
|---------|-----------|
| **ProPresenter API** | Sincronização de músicas, envio de playlists |
| **SMTP/Email** | Envio de notificações |
| **Calendário (iCal)** | Export de escalas |

### Requisitos Não-Funcionais

- **Performance**: Carregamento inicial < 3s
- **Responsivo**: Funciona em mobile, tablet e desktop
- **Offline**: Escalas disponíveis sem internet
- **Segurança**: Autenticação segura, HTTPS
- **Backup**: Backup diário automático do banco

---

## 5. Modelo de Dados (Visão Geral)

```
┌─────────────────┐     ┌─────────────────┐
│     Usuario     │     │   Ministerio    │
├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │
│ nome            │     │ nome            │
│ email           │     │ descricao       │
│ papel           │     │ lider_id ──────────┐
│ ativo           │     └─────────────────┘  │
└─────────────────┘              │            │
        │                        │            │
        │         ┌──────────────┘            │
        │         │                           │
        ▼         ▼                           │
┌─────────────────────┐                       │
│  MembroMinisterio   │                       │
├─────────────────────┤                       │
│ usuario_id          │                       │
│ ministerio_id       │                       │
│ posicao             │ (ex: "Mesa de Som")   │
│ ativo               │                       │
└─────────────────────┘                       │
                                              │
┌─────────────────┐     ┌─────────────────┐   │
│     Evento      │     │   OrdemCulto    │   │
├─────────────────┤     ├─────────────────┤   │
│ id              │◄────│ evento_id       │   │
│ nome            │     │ ordem           │   │
│ tipo            │     │ tipo_item       │   │
│ data_hora       │     │ descricao       │   │
│ status          │     │ duracao_minutos │   │
└─────────────────┘     │ responsavel_id  │   │
        │               └─────────────────┘   │
        │                                     │
        ▼                                     │
┌─────────────────────┐                       │
│       Escala        │                       │
├─────────────────────┤                       │
│ id                  │                       │
│ evento_id           │                       │
│ ministerio_id       │                       │
│ usuario_id ─────────────────────────────────┘
│ posicao             │
│ status              │ (pendente, confirmado, recusado)
│ confirmado_em       │
└─────────────────────┘

┌─────────────────┐     ┌─────────────────┐
│     Musica      │     │     Setlist     │
├─────────────────┤     ├─────────────────┤
│ id              │◄────│ musica_id       │
│ nome            │     │ evento_id       │
│ artista         │     │ ordem           │
│ tom_padrao      │     │ tom             │
│ letra           │     └─────────────────┘
│ link_cifra      │
│ propresenter_id │ (ref externa)
└─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│      Banda      │     │   MembroBanda   │
├─────────────────┤     ├─────────────────┤
│ id              │◄────│ banda_id        │
│ nome            │     │ usuario_id      │
│ ativa           │     │ instrumento     │
└─────────────────┘     └─────────────────┘

┌─────────────────┐
│      Midia      │
├─────────────────┤
│ id              │
│ evento_id       │
│ tipo            │ (imagem, video, pdf)
│ url             │
│ categoria       │ (avisos, pregacao, etc)
│ uploaded_por    │
└─────────────────┘
```

---

## 6. Fases de Desenvolvimento

### Fase 1 - MVP (Fundação)
**Objetivo**: Sistema básico funcional para gerenciar escalas

- [ ] Setup do projeto (Next.js, Prisma, Auth)
- [ ] Modelagem e criação do banco de dados
- [ ] Autenticação de usuários
- [ ] CRUD de ministérios e membros
- [ ] CRUD de eventos/cultos
- [ ] Sistema de escalas básico
- [ ] Workflow de confirmação (email)
- [ ] Dashboard do voluntário (minhas escalas)
- [ ] Dashboard do líder (escala do ministério)
- [ ] PWA básico (instalável)

### Fase 2 - Louvor e Músicas
**Objetivo**: Gestão completa de louvor

- [ ] CRUD de músicas
- [ ] CRUD de bandas
- [ ] Setlist por evento
- [ ] Integração com ProPresenter (sync de músicas)
- [ ] Acesso do músico às letras/cifras
- [ ] Relatório de músicas

### Fase 3 - Comunicação e Mídia
**Objetivo**: Gestão de conteúdo visual

- [ ] Upload de mídia (imagens, vídeos, PDFs)
- [ ] Associação de mídia aos eventos
- [ ] Galeria de mídia
- [ ] Envio de mídia para ProPresenter

### Fase 4 - Ordem do Culto e Contagiê
**Objetivo**: Coordenação completa do evento

- [ ] Editor de ordem do culto
- [ ] Templates de culto
- [ ] Dashboard do Contagiê (visão geral)
- [ ] Timeline do culto em tempo real
- [ ] Integração Services LIVE com ProPresenter

### Fase 5 - Relatórios e Refinamentos
**Objetivo**: Inteligência e otimizações

- [ ] Relatório de frequência de voluntários
- [ ] Relatório de histórico de cultos
- [ ] Sugestões automáticas de escala
- [ ] Cache offline completo
- [ ] Otimizações de performance

### Fase 6 - Controle Remoto ProPresenter
**Objetivo**: Controle avançado de apresentação

- [ ] Monitoramento de slide atual
- [ ] Controle remoto de slides
- [ ] Integração bidirecional completa

---

## 7. Critérios de Sucesso

### MVP
- [ ] Líderes conseguem criar escalas
- [ ] Voluntários recebem email e confirmam
- [ ] PWA instalável no celular
- [ ] Escalas visíveis offline

### Sistema Completo
- [ ] Redução do tempo para montar escala (vs processo atual)
- [ ] 80%+ de confirmações pelo sistema
- [ ] Integração funcionando com ProPresenter
- [ ] Adoção por todas as equipes

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| API do ProPresenter mudar | Criar camada de abstração, documentar versão |
| Baixa adoção dos voluntários | Interface simples, treinamento, email como fallback |
| Complexidade do offline | Começar simples (só escalas), expandir depois |
| Integração com ProPresenter falhar | Sistema funciona standalone, integração é bônus |

---

## 9. Próximos Passos

1. **Validar este escopo** - Revisar com stakeholders da igreja
2. **Criar wireframes** - Desenhar as principais telas
3. **Setup técnico** - Iniciar projeto, configurar ambiente
4. **Modelagem final** - Definir schema Prisma completo
5. **Desenvolvimento Fase 1** - Iniciar MVP

---

*Documento criado em: Março/2026*
*Versão: 1.0*
