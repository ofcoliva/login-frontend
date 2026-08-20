# Autenticação

Fluxo completo de autenticação no frontend — cookie httpOnly, gerenciamento de sessão e expiração.

> **Princípio:** o token JWT nunca expõe ao JavaScript. Ele vive em um cookie HttpOnly (SameSite=Lax) setado pelo backend. No frontend, o store gerencia apenas **metadados de sessão** no localStorage: flag de sessão, dados do usuário e timestamp de expiração.

## Armazenamento

| Chave localStorage | Tipo | Conteúdo |
|---|---|---|
| `auth_session` | `'1'` | Flag indicando sessão ativa |
| `auth_user` | JSON | Objeto `UserInfo` (`{ username?, email? }`) |
| `auth_expires_at` | ISO-8601 | Timestamp de expiração retornado pelo servidor |

O cookie HttpOnly é enviado automaticamente em todas as requisições via `credentials: 'include'`.

## Visão geral dos componentes

```mermaid
graph TD
    subgraph Frontend["Vue 3 SPA"]
        MAIN["main.ts<br/>bootstrap + listeners globais"]
        APP["App.vue<br/>loading gate: sessionChecking"]
        ROUTER["Router<br/>beforeEach guard<br/>requiresAuth / guestOnly"]
        STORE["Auth Store (Pinia)<br/>sessionActive, user, expiresAt<br/>clearSession, validateSession<br/>scheduleSessionExpiry"]
        HTTP["HTTP Layer — fetch wrapper<br/>credentials: include<br/>flag auth → 401 dispara CustomEvent<br/>timeout 15s via AbortController"]
        API["Auth API<br/>/login, /me, /logout<br/>/change_email, /change_username<br/>/change_password, /sessions"]
        LS["localStorage<br/>auth_session<br/>auth_user<br/>auth_expires_at"]
    end

    SERVER["Backend (FastAPI)<br/>Set-Cookie HttpOnly no login<br/>Retorna expires_at em respostas autenticadas<br/>401 se cookie inválido"]

    MAIN -->|"escuta auth:unauthorized<br/>visibilitychange"| STORE
    MAIN -->|"router.isReady → validateSession"| ROUTER
    APP -->|"v-if sessionChecking"| ROUTER
    ROUTER -->|"sessionExpired, isAuthenticated"| STORE
    STORE -->|"persist / read"| LS
    STORE -->|"login, logout, me"| API
    API -->|"auth: true → credentials: include"| HTTP
    HTTP -->|"fetch"| SERVER
    SERVER -->|"Set-Cookie + { user, expires_at }"| HTTP

    style STORE fill:#f9f,stroke:#333
    style HTTP fill:#bbf,stroke:#333
    style SERVER fill:#bfb,stroke:#333
```

## Fluxo de login

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant V as LoginView
    participant S as Auth Store
    participant A as Auth API
    participant H as HTTP (fetch)
    participant B as Backend

    U->>V: submete formulário (username + password)
    V->>S: login(payload)
    S->>S: loginLoading = true, error = null
    S->>A: authApi.login(payload)
    A->>H: POST /login (credentials: include)
    H->>B: fetch com cookie
    B-->>H: 200 { user, expires_at } + Set-Cookie HttpOnly
    H-->>A: LoginResponse
    A-->>S: resposta

    Note over S: persistir sessão
    S->>S: sessionActive = true<br/>persist: auth_session = '1'
    S->>S: user = response.user<br/>persist: auth_user = JSON
    S->>S: expiresAt = parseExpiresAt(response.expires_at)<br/>persist: auth_expires_at = ISO
    S->>S: scheduleSessionExpiry()<br/>setTimeout(clearSession, remaining)

    S-->>V: true (sucesso)
    V->>V: redirect para /profile

    Note over B,H: erro 4xx
    B-->>H: 4xx { detail: "..." }
    H-->>A: HttpError
    A-->>S: throw
    S->>S: setError(err) → error.value = mensagem
    S-->>V: false
    V->>V: exibe mensagem de erro
```

## Validação de sessão no startup

Ao carregar a app, o `main.ts` verifica se a sessão local ainda é válida e, se sim, valida com o servidor.

```mermaid
flowchart TD
    A["router.isReady()"] --> B{"sessionExpired?<br/>(Date.now >= expiresAt)"}
    B -->|"SIM"| C["auth.clearSession()<br/>(sem chamada ao servidor)"]
    B -->|"NÃO"| D{"sessionActive?<br/>(auth_session = '1')"}

    D -->|"NÃO"| E["Sessão não existe<br/>renders como visitante"]
    D -->|"SIM"| F["auth.validateSession()"]

    F --> G{"sessionExpired?<br/>(checagem dupla)"}
    G -->|"SIM"| C
    G -->|"NÃO"| H["sessionChecking = true<br/>App.vue: 'Verificando sessão...'"]
    H --> I["GET /me<br/>(auth: true, credentials: include)"]

    I -->|"200 OK"| J["atualiza user<br/>atualiza expiresAt<br/>rescheduleSessionExpiry()"]
    J --> K["sessionChecking = false<br/>renderiza conteúdo autenticado"]

    I -->|"401"| L["notifyUnauthorized()<br/>dispatchEvent('auth:unauthorized')"]
    L --> M["main.ts listener<br/>clearSession()"]
    M --> N{"rota atual<br/>requiresAuth?"}
    N -->|"SIM"| O["router.push('/login')"]
    N -->|"NÃO"| P["limpa silenciosamente"]

    I -->|"Erro de rede"| Q["clearSession()"]
    Q --> E

    style C fill:#f66,color:#fff
    style L fill:#f66,color:#fff
    style K fill:#6f6,color:#000
```

## Os 4 mecanismos de expiração

A sessão pode expirar por 4 caminhos independentes. Todos convergem para `clearSession()`.

### Visão geral

```mermaid
graph TB
    subgraph A["⏰ Timer (setTimeout)"]
        A1["scheduleSessionExpiry()"] --> A2{"remaining = expiresAt - Date.now"}
        A2 -->|"<= 0"| A3["clearSession()"]
        A2 -->|"> 0"| A4["setTimeout(scheduleSessionExpiry,<br/>min remaining, MAX_TIMEOUT_MS)"]
        A4 -->|"~24.8 dias max"| A1
    end

    subgraph B["🧭 Router Guard (beforeEach)"]
        B1["Navegação"] --> B2["router.beforeEach()"]
        B2 --> B3{"sessionExpired()?"}
        B3 -->|"SIM"| B4["clearSession()"]
        B3 -->|"NÃO"| B5{"requiresAuth &&<br/>!isAuthenticated?"}
        B5 -->|"SIM"| B6["redirect /login"]
        B5 -->|"NÃO"| B7{"guestOnly &&<br/>isAuthenticated?"}
        B7 -->|"SIM"| B8["redirect /home"]
        B7 -->|"NÃO"| B9["permite navegação"]
    end

    subgraph C["👁️ visibilitychange"]
        C1["User volta à aba"] --> C2{"visibilityState<br/>== 'visible'?"}
        C2 -->|"SIM"| C3{"sessionExpired()?"}
        C3 -->|"SIM"| C4["clearSession()"]
        C3 -->|"NÃO"| C5["nada faz"]
        C2 -->|"NÃO"| C5
    end

    subgraph D["🔄 Startup Validation"]
        D1["App carrega"] --> D2{"sessionExpired() local?"}
        D2 -->|"SIM"| D3["clearSession()"]
        D2 -->|"NÃO"| D4["GET /me → valida cookie"]
        D4 -->|"401 ou erro"| D5["clearSession()"]
    end

    A3 --> CLEAR["clearSession()"]
    B4 --> CLEAR
    C4 --> CLEAR
    D3 --> CLEAR
    D5 --> CLEAR

    CLEAR --> R["localStorage limpo<br/>estado reativo zerado<br/>timer cancelado"]

    style A fill:#ffd,stroke:#333
    style B fill:#dff,stroke:#333
    style B6 fill:#f66,color:#fff
    style B8 fill:#f66,color:#fff
    style C fill:#dfd,stroke:#333
    style D fill:#fdd,stroke:#333
    style CLEAR fill:#f66,color:#fff
    style R fill:#6f6,color:#000
```

### Detalhes de cada mecanismo

#### A — Timer (`setTimeout` recursivo)

**Arquivo:** `src/stores/auth.ts:108-123`

```
scheduleSessionExpiry()
  → clearTimeout(expiryTimer)
  → remaining = expiresAt - Date.now()
  → remaining <= 0?
      SIM → clearSession()
      NÃO → setTimeout(scheduleSessionExpiry, min(remaining, 2_147_000_000))
```

- `MAX_TIMEOUT_MS = 2_147_000_000` (~24.8 dias) — evita overflow de 32 bits do `setTimeout`
- Timer é recursivo: quando dispara, reagenda se ainda houver tempo, ou chama `clearSession()`
- Agendado em: `login()`, `validateSession()`, `changeEmail()`, `changeUsername()`
- Cancelado por: `clearExpiryTimer()` chamado dentro de `clearSession()`

#### B — Router Guard (`beforeEach`)

**Arquivo:** `src/router/index.ts:57-68`

- Roda a **cada navegação** antes da resolução da rota
- Checa `sessionExpired()` (comparação `Date.now() >= expiresAt`)
- Se expirou → `clearSession()` silenciosamente
- depois aplica regras de acesso:
  - `requiresAuth` + não autenticado → `/login`
  - `guestOnly` + autenticado → `/home`

#### C — `visibilitychange`

**Arquivo:** `src/main.ts:39-43`

- Dispara quando o usuário **volta para a aba** do browser
- Verifica `sessionExpired()` — se o timer foi throttled pelo browser (aba em background), este mecanismo pega

#### D — Startup Validation

**Arquivo:** `src/main.ts:31-37` + `src/stores/auth.ts:268-291`

- Roda uma única vez no carregamento da app
- Se a sessão local expirou → `clearSession()` sem chamada ao servidor
- Se não expirou → `GET /me` para validar o cookie com o servidor
- Sucesso → atualiza `user` + `expiresAt` + reschedule timer
- 401/erro → `clearSession()`

## Tratamento de 401 (Unauthorized)

Quando uma chamada API com `auth: true` retorna 401, o HTTP layer dispara um CustomEvent que é capturado globalmente.

```mermaid
sequenceDiagram
    autonumber
    participant C as Chamada API<br/>(ex: GET /me)
    participant H as HTTP Layer<br/>(http.ts)
    participant E as CustomEvent<br/>'auth:unauthorized'
    participant M as main.ts<br/>listener global
    participant S as Auth Store
    participant R as Router

    C->>H: request('/me', auth: true)
    H->>H: fetch() com credentials: include
    H-->>H: resposta 401

    Note over H: auth && status === 401
    H->>E: window.dispatchEvent<br/>(CustomEvent)

    H-->>C: throw HttpError(401)

    E->>M: listener captura evento
    M->>S: auth.clearSession()
    Note over S: limpa: sessionActive, user, expiresAt<br/>remove: auth_session, auth_user, auth_expires_at<br/>cancela: expiryTimer

    M->>R: router.currentRoute.meta.requiresAuth?
    alt Rota protegida (/profile, /settings)
        R-->>M: SIM
        M->>R: router.push({ name: 'login' })
    else Rota pública (/home)
        R-->>M: NÃO
        Note over M: sessão limpa silenciosamente<br/>sem redirect
    end
```

### Endpoints com `auth: true` (disparam evento em 401)

| Endpoint | Método | Descrição |
|---|---|---|
| `/me` | GET | Valida sessão, retorna user + expires_at |
| `/logout` | POST | Invalida cookie no servidor |
| `/change_password` | PATCH | Altera senha |
| `/change_email` | PATCH | Altera email (renova expires_at) |
| `/change_username` | PATCH | Altera username (renova expires_at) |
| `/sessions` | GET | Lista sessões ativas |
| `/sessions/:id` | DELETE | Encerra uma sessão específica |

### Endpoints sem `auth: true` (401 tratado normalmente)

| Endpoint | Método |
|---|---|
| `/login` | POST |
| `/register` | POST |
| `/forgot_password` | POST |

## Logout

```mermaid
flowchart TD
    A["User clica Logout"] --> B["authStore.logout()"]
    B --> C{"logoutLoading?"}
    C -->|"SIM (já em andamento)"| D["return — evita duplo clique"]
    C -->|"NÃO"| E["logoutLoading = true"]
    E --> F["POST /logout<br/>(auth: true, credentials: include)"]
    F -->|"200 OK"| G["Server invalidata cookie"]
    F -->|"Erro"| H["catch — ignora<br/>(sessão local limpa mesmo se API falhar)"]
    G --> I["clearSession()"]
    H --> I

    I --> J["clearExpiryTimer()"]
    J --> K["sessionActive = false"]
    K --> L["user = null"]
    L --> M["expiresAt = null"]
    M --> N["localStorage.removeItem<br/>(auth_session, auth_user, auth_expires_at)"]

    N --> O["logoutLoading = false"]
    O --> P["redirect para /home"]

    style I fill:#f66,color:#fff
    style P fill:#6f6,color:#000
```

## Renovação de sessão

Não existe refresh token. O servidor pode **renovar** a sessão retornando um novo `expires_at` em chamadas autenticadas. O frontend sempre picks up o valor mais recente:

- `GET /me` (startup validation)
- `PATCH /change_email`
- `PATCH /change_username`

Quando `response.expires_at` está presente, o store:
1. Atualiza `expiresAt.value`
2. Persiste no localStorage
3. Reschedule o timer `scheduleSessionExpiry()`

## Referência de componentes

| Componente | Arquivo | Responsabilidade |
|---|---|---|
| Auth Store | `src/stores/auth.ts` | Estado reativo, login/logout, timer, clearSession, validateSession |
| HTTP Layer | `src/services/http.ts` | fetch wrapper com `credentials: 'include'`, flag `auth`, CustomEvent em 401, timeout 15s |
| Auth API | `src/services/authApi.ts` | Chamadas tipadas para endpoints de autenticação |
| Router Guard | `src/router/index.ts` | `beforeEach`, regras `requiresAuth` / `guestOnly` |
| Startup | `src/main.ts:31-37` | `validateSession()` no boot da app |
| visibilitychange | `src/main.ts:39-43` | Re-verifica expiração ao voltar à aba |
| Unauthorized | `src/main.ts:22-27` | Escuta `auth:unauthorized`, limpa sessão + redirect |
| Config | `src/config/api.ts` | Chaves do localStorage, base URL da API |
| Types | `src/types/auth.ts` | `LoginResponse`, `UserInfo`, `SessionInfo`, payloads |
