<div align="center">

# 🗂️ FreelaTracker

**Plataforma full-stack para freelancers gerenciarem projetos, tempo, entregas e pagamentos — com um portal dedicado para os clientes acompanharem tudo.**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## 📑 Sumário

- [Sobre o projeto](#-sobre-o-projeto)
- [Principais funcionalidades](#-principais-funcionalidades)
- [Stack](#-stack)
- [Arquitetura](#-arquitetura)
- [Segurança](#-segurança)
- [Como rodar localmente](#-como-rodar-localmente)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [Scripts disponíveis](#-scripts-disponíveis)
- [Testes & CI](#-testes--ci)
- [Estrutura de pastas](#-estrutura-de-pastas)
- [Roadmap](#-roadmap)
- [Autor](#-autor)

---

## 💡 Sobre o projeto

O **FreelaTracker** resolve um problema comum de quem trabalha como freelancer: centralizar a gestão de projetos **e** dar transparência ao cliente sem expor dados internos.

São **dois tipos de usuário**, com áreas e permissões totalmente separadas:

- **Admin (o freelancer)** — cria projetos, registra horas com um cronômetro, define cobrança e parcelas, publica entregas para aprovação, envia e-mails e acompanha relatórios.
- **Cliente** — acessa um portal próprio onde vê **apenas** os projetos vinculados a ele, com o nível de detalhe que o admin liberou (progresso, entregas, financeiro, etc.) através de um sistema de permissões granular.

O projeto foi construído com foco em **organização em camadas**, **tipagem forte de ponta a ponta** e **segurança como requisito de primeira classe** (e não como ajuste posterior).

---

## ✨ Principais funcionalidades

### Área do Admin
- 📊 **Dashboard** com cartões de estatísticas, *sparkline* de horas dos últimos 7 dias, grid de projetos ativos (com alerta visual de estouro de estimativa), painel de próximas tarefas (7 dias), feed de atividade com ícone por tipo de evento e resumo financeiro consolidado.
- ⏱️ **Cronômetro de trabalho** com seletor de projeto, pausar/retomar/parar e nota obrigatória ao encerrar (que vira uma atualização no feed). O estado é reconstruído do servidor — sobrevive a reload.
- 📁 **Projetos & tarefas** com status, progresso, prazo, estimativa de horas e tarefas com prioridade e data de entrega.
- 💰 **Financeiro por projeto** — cobrança fixa, por hora ou parcelada; gestão de parcelas com validação de soma e status.
- 📦 **Entregas com aprovação** — upload de imagens (validadas por *magic bytes*, reprocessadas e sem EXIF), versionamento, fluxo de aprovar / solicitar alteração e bloqueio pós-aprovação.
- ✉️ **Notificações por e-mail** (Resend) com *fallback* em modo *stub* e histórico por projeto.
- 📈 **Relatórios de horas** com gráfico de barras, comparativo com a estimativa e **exportação CSV**.
- 👥 **Gestão de clientes** com permissões configuráveis, notas internas (nunca expostas ao cliente) e geração de senha temporária.

### Portal do Cliente
- 🔐 Login separado, com **troca de senha obrigatória** no primeiro acesso.
- 🪟 Dashboard por projeto: progresso, timeline de marcos, tarefas, feed de atualizações, **entregas para aprovar** e resumo financeiro — cada bloco exibido conforme as permissões liberadas.
- ✅ Aprovar entregas ou solicitar alterações (com feedback obrigatório).

---

## 🧰 Stack

| Camada | Tecnologias |
|---|---|
| **Backend** | Node.js · TypeScript · Express · Prisma ORM · PostgreSQL |
| **Frontend** | React · TypeScript · Vite · CSS Modules · React Router · Recharts |
| **Auth** | JWT (access + refresh com rotação) · bcrypt · cookies httpOnly |
| **Infra/Libs** | Zod (validação) · Helmet · Multer + Sharp (imagens) · Resend (e-mail) · Winston (logs) · Swagger (docs) |

---

## 🏛️ Arquitetura

O backend segue uma **arquitetura em camadas** com responsabilidade única por arquivo:

```
Rota  →  Controller  →  Service  →  Repository  →  Prisma/DB
(HTTP)   (req/res)      (regras)     (queries)
```

- **Controllers** só conhecem HTTP (não contêm regra de negócio).
- **Services** concentram as regras e a validação de posse (*ownership*).
- **Repositories** isolam o acesso ao banco (Prisma).
- **Middlewares** cuidam de auth, validação (Zod), rate limiting, sanitização e segurança.

O frontend é organizado por **páginas**, **componentes reutilizáveis**, **services** (camada de API com Axios) e **context** de autenticação, com **CSS Modules** por componente e design tokens centralizados.

A documentação interativa da API (Swagger) fica disponível em **`/api/docs`**.

---

## 🔒 Segurança

A segurança foi tratada como prioridade ao longo de todo o projeto:

- 🆔 **UUID** em todos os modelos (sem IDs sequenciais em URLs).
- 🔑 **JWT** com *access token* curto (15 min, mantido só em memória no front) e *refresh token* (7 dias, em **cookie httpOnly** com **rotação** e hash no banco).
- 🛡️ **Validação de posse em toda requisição** — o cliente só acessa recursos dos projetos vinculados a ele (nunca confia apenas no parâmetro da URL).
- 🔐 **Senhas com bcrypt** (custo 12) e **anti-enumeração** de contas (resposta e tempo constantes).
- 🚧 **Bloqueio progressivo de login** + **rate limiting** granular (auth, upload, e-mail e global).
- 🧹 **Sanitização de entrada** (DOMPurify), proteção contra *parameter pollution* (hpp) e validação com **Zod**.
- 🪖 **Helmet** com CSP restrita; **CORS** por lista branca explícita.
- 🖼️ **Uploads** validados por *magic bytes* (não pela extensão), reprocessados com Sharp (remoção de EXIF) e renomeados para UUID.
- 📝 **Audit log** de ações sensíveis e **logs estruturados** (Winston).
- 🙈 Segredos **somente em `.env`** (este repositório versiona apenas o `.env.example`).

---

## 🚀 Como rodar localmente

### Pré-requisitos
- **Node.js** 18+ (recomendado 20+)
- **PostgreSQL** 14+ em execução

### 1. Clonar e instalar
```bash
git clone https://github.com/MateusLima00/freela-tracker-Port.git
cd freela-tracker-Port

# Backend
cd backend && npm install

# Frontend (em outro terminal)
cd ../frontend && npm install
```

### 2. Configurar o ambiente
Copie o exemplo e preencha os valores:
```bash
cd backend
cp .env.example .env
```
Gere os segredos JWT (devem ser diferentes entre si):
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Banco de dados (migrations + seed)
```bash
cd backend
npm run prisma:migrate   # aplica as migrations
npm run prisma:seed      # cria admin + cliente demo (senhas vêm do .env)
```

### 4. Subir os servidores
```bash
# Backend → http://localhost:3000  (docs em /api/docs)
cd backend && npm run dev

# Frontend → http://localhost:5173
cd frontend && npm run dev
```

Acesse **http://localhost:5173**. As credenciais iniciais são as definidas em `SEED_ADMIN_PASSWORD` / `SEED_CLIENT_PASSWORD` (usuários `admin@freela.com` e `cliente@freela.com`).

> 💡 Sem `RESEND_API_KEY`, o serviço de e-mail roda em **modo stub** (apenas registra/loga, sem enviar) — então não é preciso configurar nada para testar os fluxos.

---

## ⚙️ Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `PORT` | Porta do backend (padrão `3000`) |
| `NODE_ENV` | `development` ou `production` |
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `JWT_ACCESS_SECRET` | Segredo do access token |
| `JWT_REFRESH_SECRET` | Segredo do refresh token (diferente do access) |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | Expiração dos tokens (ex.: `15m`, `7d`) |
| `BCRYPT_ROUNDS` | Custo do bcrypt (10–14, padrão 12) |
| `CORS_ORIGIN` | Origem(ns) permitida(s) do frontend |
| `SEED_ADMIN_PASSWORD` / `SEED_CLIENT_PASSWORD` | Senhas usadas no seed |
| `RESEND_API_KEY` / `EMAIL_FROM` | E-mail transacional (opcional — sem key, vira stub) |
| `CLOUDINARY_URL` | Storage de imagens (opcional — sem ela, grava localmente) |

> ⚠️ O arquivo `.env` **não** é versionado. Use o `.env.example` como referência.

---

## 📜 Scripts disponíveis

**Backend**
| Comando | Ação |
|---|---|
| `npm run dev` | Sobe o servidor em modo dev (hot reload) |
| `npm run build` | Compila o TypeScript (type-check + emit) |
| `npm start` | Roda a build de produção |
| `npm test` | Roda os testes unitários (Vitest) |
| `npm run prisma:migrate` | Aplica as migrations |
| `npm run prisma:seed` | Popula admin + cliente demo |
| `npm run prisma:studio` | Abre o Prisma Studio |

**Frontend**
| Comando | Ação |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção |
| `npm run preview` | Pré-visualiza a build |

---

## 🧪 Testes & CI

- **Testes unitários** do `auth.service` com **Vitest**, cobrindo o fluxo de login (bloqueio progressivo após tentativas, anti-enumeração de contas, emissão de tokens) e a troca de senha do cliente. Repositórios e utilitários (`bcrypt`, JWT) são mockados — os testes rodam sem banco.

  ```bash
  cd backend && npm test
  ```

- **Integração contínua** (GitHub Actions, `.github/workflows/ci.yml`) em todo `push`/`pull request` para `main`, com dois jobs paralelos em Node 20:
  - **Backend** — `npm ci` → `npm run build` (type-check + compilação) → `npm test`.
  - **Frontend** — `npm ci` → `npm run build` (type-check + build Vite).

> O type-check estrito do TypeScript nos dois lados funciona como uma rede de segurança adicional a cada commit.

---

## 📂 Estrutura de pastas

```
freela-tracker/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # modelos e enums
│   │   └── migrations/          # histórico de migrations
│   └── src/
│       ├── config/              # env, database, logger, swagger, storage
│       ├── controllers/         # camada HTTP
│       ├── services/            # regras de negócio
│       ├── repositories/        # acesso ao banco (Prisma)
│       ├── routes/              # definição das rotas + Swagger
│       ├── middlewares/         # auth, validação, rate limit, segurança
│       ├── validations/         # schemas Zod
│       ├── utils/               # helpers (hash, jwt, imagem, csv, etc.)
│       └── database/seeds/      # seed
└── frontend/
    └── src/
        ├── pages/               # páginas (admin / client)
        ├── components/          # componentes reutilizáveis
        ├── services/            # camada de API (Axios)
        ├── context/ & hooks/    # autenticação
        ├── routes/              # roteamento e guards
        ├── interfaces/ & enums/ # tipos compartilhados
        └── styles/              # tokens e CSS global
```

---

## 🗺️ Roadmap

- [x] Design system e identidade visual
- [x] Autenticação (admin + cliente) com refresh token e rotação
- [x] Gestão de clientes com permissões e notas internas
- [x] Dashboard do cliente por projeto
- [x] Cronômetro integrado ao feed de atualizações
- [x] Financeiro (cobrança fixa / hora / parcelas)
- [x] Entregas com upload, versionamento e aprovação
- [x] Notificações por e-mail (Resend + stub)
- [x] Relatórios de horas com exportação CSV
- [x] Histórico de sessões do timer
- [x] Camada de segurança transversal (audit log, rate limiting, sanitização, etc.)
- [x] Testes unitários do serviço de autenticação (Vitest)
- [x] CI no GitHub Actions (build + testes em cada push/PR)
- [ ] Storage de imagens em nuvem por padrão (Cloudinary/S3)
- [ ] Ampliar cobertura de testes (integração + e2e)

---

## 👤 Autor

Desenvolvido por **Mateus Lima** como projeto de portfólio full-stack.

> Projeto para fins de demonstração técnica. Sinta-se à vontade para explorar o código.
