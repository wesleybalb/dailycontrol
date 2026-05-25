# 🏛️ Daily Control — Coelho & Araújo

Sistema de controle de jornada de trabalho para o escritório **Coelho & Araújo Assessoria e Consultoria Jurídica**.

---

## 📋 Sobre o projeto

Ferramenta interna para registro diário de atividades dos colaboradores, com checklist padronizado baseado nos procedimentos do escritório. Cada colaborador preenche seu registro diário com evidências de conclusão de cada tarefa.

---

## ✨ Funcionalidades

- **Login seguro** com autenticação via Supabase Auth
- **Painel principal** com tabs individuais por colaborador
- **Checklist diário** com 16 itens divididos em 3 blocos:
  - 🌅 Início do expediente (7 itens)
  - ☀️ Meio do dia (3 itens)
  - 🌆 Final do expediente (5 itens)
- **Upload de evidências** (imagem ou PDF, máx. 4MB) por item concluído
- **Dois modos de registro:** rascunho (editável) e fechado (somente leitura)
- **Bloqueio automático** de rascunhos após meia-noite do dia de criação
- **Busca por período** nos registros de cada colaborador
- **Painel administrativo** para gestão de usuários (criar, ativar/desativar, reset de senha)
- **Log de auditoria** de todas as ações relevantes do sistema

---

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Servidor | Node.js + Express |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Storage (evidências) | Supabase Storage |
| Sessão | cookie-session (stateless) |
| Frontend | HTML + CSS + JS Vanilla |
| Deploy | Vercel |

---

## 📁 Estrutura do projeto

```
dailycontrol/
├── api/
│   └── index.js              # Entry point Vercel serverless
├── config/
│   └── supabase.js           # Clientes Supabase (anon + admin)
├── controllers/
│   ├── authController.js     # Login e logout
│   ├── homeController.js     # Painel principal e API de tabs
│   ├── registroController.js # CRUD de registros diários
│   ├── checklistController.js# Toggle de itens e upload de evidências
│   └── adminController.js    # Gestão de usuários
├── middlewares/
│   └── authMiddleware.js     # requireAuth, requireAdmin, requireRegistroEditavel
├── models/
│   ├── usuarioModel.js
│   ├── registroModel.js
│   ├── checklistModel.js
│   └── auditModel.js
├── routes/
│   ├── authRoutes.js
│   ├── homeRoutes.js
│   ├── registroRoutes.js
│   ├── checklistRoutes.js
│   └── adminRoutes.js
├── views/
│   ├── layout.js             # Template base de todas as páginas
│   ├── home.js               # Painel principal
│   └── admin.js              # Gestão de usuários
├── public/
│   ├── css/main.css
│   └── js/app.js             # JavaScript client-side
├── app.js                    # Express app (roda local e exporta para Vercel)
├── vercel.json               # Configuração de deploy
└── .env.example              # Variáveis de ambiente necessárias
```

---

## ⚙️ Configuração

### 1. Variáveis de ambiente

Copie o `.env.example` para `.env` e preencha:

```env
NODE_ENV=production
SESSION_SECRET=          # string aleatória de 64 chars (veja abaixo)
SUPABASE_URL=            # Project Settings → API → Project URL
SUPABASE_ANON_KEY=       # Project Settings → API → anon / public
SUPABASE_SERVICE_KEY=    # Project Settings → API → service_role
```

Gere o `SESSION_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Banco de dados (Supabase)

Execute o script SQL completo disponível em `supabase_schema.sql` no **SQL Editor** do Supabase. Ele cria:

- Tabelas: `usuarios`, `registros`, `checklist_itens`, `checklist_template`, `audit_logs`
- Políticas RLS para cada tabela
- Triggers automáticos (`fechado_em`, `concluido_em`)
- 15 itens padrão do checklist

### 3. Storage (Supabase)

Crie o bucket `evidencias` em **Storage** do Supabase:
- Tipo: **privado**
- Tamanho máximo: **4 MB**
- Tipos aceitos: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`

### 4. Primeiro usuário administrador

O primeiro admin precisa ser criado diretamente no Supabase:

1. **Authentication → Users → Add User** — crie o usuário com e-mail e senha
2. **SQL Editor** — execute:

```sql
INSERT INTO public.usuarios (auth_user_id, nome, email, role)
VALUES (
  '<UUID do usuário criado acima>',
  'Nome Completo',
  'email@escritorio.adv.br',
  'admin'
);
```

Depois disso, todos os demais usuários são criados pelo painel administrativo do sistema.

---

## 🚀 Deploy no Vercel

### Via GitHub (recomendado)

1. Suba o projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) → **Add New Project**
3. Selecione o repositório — o Vercel detecta o `vercel.json` automaticamente
4. Adicione as variáveis de ambiente na tela de configuração
5. Clique em **Deploy**

A partir daí, todo `git push` na branch `main` faz um novo deploy automaticamente.

### Via CLI

```bash
npm install -g vercel
vercel login
vercel
```

---

## 💻 Rodando localmente

```bash
# Instale as dependências
npm install

# Crie o .env
cp .env.example .env
# Edite o .env com suas credenciais

# Inicie em modo desenvolvimento
npm run dev

# Acesse
# http://localhost:3000
```

---

## 🔐 Controle de acesso

| Rota | Sem login | Usuário | Admin |
|---|---|---|---|
| `GET /login` | ✅ | Redireciona para `/` | Redireciona para `/` |
| `GET /` | Redireciona para `/login` | ✅ | ✅ |
| `GET /admin` | Redireciona para `/login` | Redireciona para `/` | ✅ |
| `POST /registro/novo` | ❌ | Apenas o próprio | ✅ |
| `PATCH /registro/:id/fechar` | ❌ | Apenas o próprio (mesmo dia) | ✅ |

---

## 📌 Regras de negócio

- Cada colaborador pode ter **apenas um registro por dia**
- Registros são **bloqueados para edição após meia-noite** do dia de criação
- Ao marcar um item do checklist, é **obrigatório anexar uma evidência** (imagem ou PDF)
- Registros **fechados são irreversíveis** — não podem ser reabertos
- Colaboradores podem **visualizar** os registros de todos, mas **editar apenas os próprios**
- Apenas **administradores** podem criar, ativar ou desativar usuários

---

## 🗂️ API Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/login` | Tela de login |
| `POST` | `/login` | Autenticar |
| `GET` | `/logout` | Encerrar sessão |
| `GET` | `/` | Painel principal |
| `GET` | `/api/tab/:usuarioId` | Dados de uma tab (JSON) |
| `POST` | `/registro/novo` | Criar registro do dia |
| `GET` | `/registro/:id` | Buscar registro completo |
| `PATCH` | `/registro/:id/rascunho` | Salvar rascunho |
| `PATCH` | `/registro/:id/fechar` | Fechar registro |
| `PATCH` | `/checklist/:itemId/toggle` | Marcar/desmarcar item |
| `POST` | `/checklist/:itemId/evidencia` | Upload de evidência |
| `DELETE` | `/checklist/:itemId/evidencia` | Remover evidência |
| `GET` | `/admin` | Painel administrativo |
| `POST` | `/admin/usuario` | Criar usuário |
| `PATCH` | `/admin/usuario/:id/ativo` | Ativar/desativar usuário |
| `POST` | `/admin/usuario/:id/reset-senha` | Redefinir senha |

---

## 👥 Desenvolvido para

**Coelho & Araújo Assessoria e Consultoria Jurídica**  
dailycontrol.cea.adv@outlook.com