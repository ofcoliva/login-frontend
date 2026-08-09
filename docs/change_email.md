# Contrato — Alteração de email (`PATCH /api/v1/change_email`)

Contrato para implementação no backend. O frontend (`login-frontend`) já consome este endpoint.

## Resumo

Permite que o usuário autenticado altere o email da conta. Exige a **senha atual** como confirmação. Em caso de sucesso, retorna o usuário atualizado e o novo `expires_at` da sessão.

## Request

- **Método:** `PATCH`
- **Rota:** `/api/v1/change_email`
- **Autenticação:** cookie httpOnly (o mesmo definido em `POST /login`)
- **Content-Type:** `application/json`
- **Corpo:**

```json
{
  "new_email": "novo@email.com",
  "password": "senha-atual"
}
```

Schema (pydantic):

```python
class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    password: str
```

## Validações de `new_email`

Devem espelhar a política do frontend (`src/utils/emailPolicy.ts`):

- Exatamente um `@`, com nome e domínio
- Sem espaços
- Nome válido: letras, números, `.`, `_`, `-`
- Domínio com ponto válido (ex.: `gmail.com`)
- Até 254 caracteres
- Deve ser **diferente** do email atual da conta (o frontend já bloqueia; o backend também deve)
- Não pode estar em uso por outra conta → `409`

## Success — `200`

```json
{
  "user": { "username": "joao", "email": "novo@email.com" },
  "expires_at": "2026-08-04T13:00:00Z"
}
```

- `expires_at`: ISO 8601 UTC. Pode ser derivado do claim `exp` do JWT atual ou, se houver rotação de token, do novo `exp`. O frontend o usa para agendar a expiração local da sessão; é **opcional** — se ausente, o frontend mantém o valor que já tem.
- O cookie httpOnly **continua válido** (não é obrigatório reenviar `Set-Cookie` se não houver rotação de token).

## Erros

Todos os erros são JSON `{"detail": "..."}` — o frontend exibe `detail` como mensagem (cai para `Erro <status>` se ausente).

| Status | Condição |
| --- | --- |
| `400` | Senha atual incorreta; `new_email` igual ao atual; formato inválido |
| `401` | Sem cookie / sessão inválida ou expirada (JWT com `sid` revogado) |
| `409` | `new_email` já cadastrado em outra conta |
| `422` | Validação do schema (pydantic) |
| `429` | Rate limit |

## Regras de segurança

- Operar sempre sobre o usuário do JWT autenticado (nunca por campo do corpo).
- Verificar a senha com Argon2id (comparação segura). **Nunca** logar ou retornar a senha.
- Em `401` nesta rota, o frontend dispara `auth:unauthorized` → limpa a sessão e redireciona para `/login`.
- Rate limit já é aplicado pelo nginx do backend (`limit_req`, `429` com `Retry-After`) para mitigar tentativas de senha.
- A sessão atual **permanece ativa** (o frontend não espera logout após troca de email). Se quiser invalidar outras sessões, revogue os `sid` diferentes do atual na tabela `sessions`.

## Fluxo opcional: verificação de email novo

Duas opções para o backend:

- **Opção A (simples, o que o frontend espera hoje):** altera o email imediatamente e retorna `200`.
- **Opção B (recomendada para produção):** gera token de verificação e envia email; o email só muda após `GET /verify_email?token=...` confirmar. **Mudanças no contrato:** o endpoint passa a retornar `202 Accepted` (email ainda não alterado) e o `user.email` retornado continua sendo o antigo. O frontend precisaria ser ajustado (hoje espera `200` com o email já trocado).

Se implementar a opção B, alinhe antes — o frontend atual não a suporta sem mudanças.

## Impacto no frontend (já implementado)

- `src/services/authApi.ts` → `changeEmail(payload)` → `PATCH /change_email` com `auth: true`.
- `src/stores/auth.ts` → `changeEmail` atualiza `user.email`, persiste em `localStorage`, reparseia `expires_at` e reagenda a expiração local.
- `src/components/auth/ChangeEmailForm.vue` → coleta `new_email`, abre diálogo de confirmação ("Tem certeza que deseja trocar o email da conta para x@y.com?"), pede a senha e chama o store.
- Fluxo de UI: **Configurações → Segurança → Trocar email**.

## Testes sugeridos (backend)

- `200` altera o email no banco e retorna `user`/`expires_at`.
- `409` quando `new_email` pertence a outra conta (não muda o email atual).
- `400` com senha incorreta (não muda nada).
- `401` sem cookie / com JWT cujo `sid` foi revogado.
- `422` com `new_email` inválido.
- Garantir que a sessão atual continua válida após o sucesso (`GET /me` → `200`).
