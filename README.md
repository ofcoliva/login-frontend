# login-frontend

Frontend de autenticação em Vue 3 + Vite + TypeScript (Pinia, vue-router, Vitest, Playwright).

Autenticação por **cookie httpOnly** (SameSite=Lax) definido pelo backend — nenhum token exposto ao JavaScript (proteção contra XSS).

## Stack

- Vue 3 (`<script setup>`) + TypeScript
- Vite + vue-tsc
- Pinia (estado de sessão) + vue-router (rotas protegidas)
- Vitest (unit) + Playwright (e2e)
- oxlint / ESLint / oxfmt

## Configuração

```sh
bun install
bun dev            # Vite, proxy /api → http://localhost:8000
bun run build
bun test:unit
bun run lint
```

`VITE_API_BASE_URL` (`.env`) define a base da API; padrão `/api/v1`. Em dev, o proxy do Vite redireciona `/api` para `http://localhost:8000`.

## Contrato de API

Base: `/api/v1`. Todas as chamadas usam `credentials: 'include'` (cookie enviado automaticamente) e enviam corpo JSON com `Content-Type: application/json` quando aplicável.

### Autenticação (cookie httpOnly)

| Cenário | Comportamento |
| --- | --- |
| Login bem-sucedido | Backend define cookie httpOnly (SameSite=Lax) via `Set-Cookie` e responde `200 {"user": {...}, "expires_at": "<ISO UTC>"}` |
| Sessão válida | `GET /me` → `200 {"user": {...}, "expires_at": "<ISO UTC>"}` |
| Sessão inválida/expirada | `GET /me` → `401 {"detail": "..."}` |
| 401 em rota autenticada | Frontend dispara `auth:unauthorized`, limpa a sessão e redireciona para `/login` |
| Token expira no tempo (`expires_at`) | Frontend desloga localmente via timer (e `visibilitychange`); `expires_at` ausente → depende do `/me` no boot |

`expires_at` (ISO 8601 UTC, derivado do claim `exp` do JWT) é **opcional** no frontend: se ausente, a sessão segue dependendo do `/me`. O valor é perseguido em `localStorage` (`auth_expires_at`) e re-sincronizado a cada `/me` bem-sucedido. A autoridade final continua sendo o 401 do backend.

O cookie é httpOnly, então **o nome dele é irrelevante para o frontend** — o JS nunca o lê. No backend, `/me` e demais rotas autenticadas devem ler o mesmo cookie que `/login` define.

### Endpoints

| Método | Rota | Autenticado | Corpo | Respostas |
| --- | --- | --- | --- | --- |
| POST | `/register` | não | `{username, email, password}` | 201 · 409 (já existe) · 422 (validação) |
| GET | `/verify_email` | não | `?token=` | 200 · 410 (expirado/inválido) |
| POST | `/login` | não | `{username, password}` | 200 `{"user": {"username", "email"}, "expires_at"}` + cookie · 401 |
| POST | `/logout` | sim | — | 204 (limpa o cookie) · 401 |
| PATCH | `/change_password` | sim | `{current_password, new_password}` | 204 · 400/401 · 422 |
| DELETE | `/delete_account` | sim | — | 204 · 401 |
| POST | `/forgot_password` | não | `{email}` | 204 (sempre genérico, evita enumeração) |
| PATCH | `/reset_password` | não | `{token, new_password}` | 204 · 400 (token inválido/expirado) · 422 |
| GET | `/me` | sim | — | 200 `{"user": {"username", "email"}, "expires_at"}` · 401 |
| GET | `/health` | não | — | 200 |

### Erros

Todos os erros são JSON `{"detail": "..."}`. O frontend usa `detail` como mensagem de erro (`HttpError.message`), caindo para `Erro <status>` quando ausente. Estados relevantes: `400`, `401`, `403`, `409`, `410`, `422`, `429`, `503`.

Timeouts: 15s por requisição; falha de rede vira `HttpError(0, "Falha de conexão com o servidor")`.

### Anti double-submit

Cada ação do store (`login`, `register`, `forgotPassword`, `logout`, `validateSession`) retorna `false` imediatamente se já estiver em loading; `BaseButton` desabilita e mostra spinner enquanto a requisição roda.

## Implementação do `/me` no backend (FastAPI)

O backend já usa JWT + cookie httpOnly. `/me` decodifica o JWT do cookie, carrega o usuário e devolve as infos públicas. O cookie **deve** ter o mesmo nome usado no login.

```python
# schemas.py
from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserInfo(BaseModel):
    username: str
    email: EmailStr

class MeResponse(BaseModel):
    user: UserInfo
    expires_at: datetime

# routes/auth.py — router prefix="/api/v1"
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from .deps import get_db  # sessão SQLAlchemy
from .schemas import MeResponse, UserInfo
from .config import settings  # SECRET_KEY, JWT_ALGORITHM, COOKIE_NAME

router = APIRouter()

@router.get("/me", response_model=MeResponse)
async def read_me(request: Request, db: Session = Depends(get_db)) -> MeResponse:
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
        expires_at = datetime.fromtimestamp(payload.get("exp"), tz=timezone.utc)
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    return MeResponse(user=UserInfo(username=user.username, email=user.email), expires_at=expires_at)
```

E o login deve passar a **devolver o usuário e o `expires_at` no body** (mantendo o cookie):

```python
@router.post("/login")
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate(db, credentials.username, credentials.password)  # Argon2id
    if user is None:
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.TOKEN_MINUTES)
    token = create_access_token({"sub": str(user.id), "exp": expires_at})
    response = JSONResponse(
        MeResponse(
            user=UserInfo(username=user.username, email=user.email),
            expires_at=expires_at,
        ).model_dump(mode="json")
    )
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.ENV == "production",
        max_age=settings.TOKEN_MINUTES * 60,
        path="/",
    )
    return response
```

### Notas de cookie

- `httponly=True` — invisível para JS (fonte da proteção contra XSS).
- `samesite="lax"` — blinda contra CSRF em envios entre sites; no login apenas via formulário nativo sem JavaScript, sem prejuízo ao frontend.
- `secure=True` em produção (HTTPS); o cookie **não** funciona se a página for servida em `http://`.
- `path="/"` para valer em todas as rotas da API.
- Funciona em máquinas diferentes desde que **frontend e API compartilhem o mesmo origin público** (ex.: nginx que proxy-a `/api` para a máquina do FastAPI). Origins diferentes (subdomínios/portas) não recebem cookie com SameSite=Lax.

### CORS

No mesmo origin (nginx), **não há CORS**. Se um dia frontend e API ficarem em origins diferentes, o backend precisa liberar apenas a origin do frontend com `credentials=True` (nunca `*`).

### Exemplo de nginx

```nginx
server {
    listen 443 ssl;
    server_name auth.exemplo.com;

    root /var/www/login-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://10.0.0.5:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Scripts

| Script | Descrição |
| --- | --- |
| `bun dev` | Servidor de desenvolvimento (proxy `/api` → `:8000`) |
| `bun run build` | type-check + build de produção para `dist/` |
| `bun test:unit` | Testes unitários (Vitest) |
| `bun test:e2e` | Testes e2e (Playwright) |
| `bun run lint` | oxlint + eslint |
| `bun run format` | oxfmt sobre `src/` |
