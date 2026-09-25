# Instructions — Backend Architecture: Aurora PE Blog

Documento de referência técnica para arquitetar, estender ou reescrever o backend do portal Aurora PE. Cobre contratos de dados, regras de negócio, queries críticas, autenticação e decisões de design.

---

## 1. Visão geral da arquitetura atual

O backend é **monolítico com server-side rendering**. FastAPI serve tanto a lógica de negócio quanto os templates HTML via Jinja2. Não há separação frontend/API — as respostas são HTML, não JSON.

```
┌─────────────────────────────────────────────┐
│                FastAPI App                  │
│                                             │
│  routers/public.py   routers/admin.py       │
│        │                    │               │
│  services/article.py  services/auth.py      │
│        │                    │               │
│     SQLAlchemy async (asyncpg)              │
│        │                                    │
│     PostgreSQL                              │
└─────────────────────────────────────────────┘
```

Se futuramente houver separação (ex: app mobile, outro frontend), o padrão é extrair os services em uma camada de API REST/GraphQL mantendo a mesma lógica de negócio.

---

## 2. Modelos de dados

### 2.1 `Category` — Editoria

```
categories
├── id              INTEGER        PK
├── name            VARCHAR(100)   NOT NULL UNIQUE   ex: "Política"
├── slug            VARCHAR(120)   NOT NULL UNIQUE   ex: "politica"
└── description     TEXT           NULLABLE
```

**Regras:**
- `slug` deve ser único, sem espaços, em letras minúsculas, separado por hífens.
- Uma categoria não pode ser deletada se houver artigos vinculados (FK constraint).

---

### 2.2 `Author` — Autor

```
authors
├── id              INTEGER        PK
├── name            VARCHAR(150)   NOT NULL
├── slug            VARCHAR(170)   NOT NULL UNIQUE   ex: "joao-silva"
├── bio             TEXT           NULLABLE
├── photo_url       VARCHAR(500)   NULLABLE
└── social_links    JSON           NULLABLE
```

**Estrutura do campo `social_links` (JSON):**
```json
{
  "twitter": "https://twitter.com/handle",
  "instagram": "https://instagram.com/handle",
  "linkedin": "https://linkedin.com/in/handle",
  "email": "autor@email.com"
}
```

**Regras:**
- `slug` gerado a partir do `name` (lowercase, espaços → hífens, sem acentos).
- Um autor não pode ser deletado se houver artigos vinculados.

---

### 2.3 `Article` — Artigo

```
articles
├── id                  INTEGER         PK
├── title               VARCHAR(300)    NOT NULL
├── slug                VARCHAR(320)    NOT NULL UNIQUE
├── subtitle            VARCHAR(500)    NULLABLE       linha fina / deck
├── chapeu              VARCHAR(100)    NULLABLE       ex: "Exclusivo", "Eleições 2026"
├── body                TEXT            NOT NULL       HTML sanitizado
├── featured_image_url  VARCHAR(500)    NULLABLE
├── reading_time_min    INTEGER         DEFAULT 1
├── is_published        BOOLEAN         DEFAULT false
├── published_at        TIMESTAMPTZ     NULLABLE       preenchido ao publicar
├── created_at          TIMESTAMPTZ     DEFAULT now()
├── updated_at          TIMESTAMPTZ     DEFAULT now()
├── author_id           INTEGER         FK → authors.id
└── category_id         INTEGER         FK → categories.id
```

**Regras de negócio:**
- `published_at` é preenchido automaticamente quando `is_published` muda de `false` para `true`. Não é atualizado em edições subsequentes.
- `reading_time_min` deve ser calculado pelo backend: `ceil(palavra_count / 200)`. Palavras por minuto médio de leitura = 200.
- O campo `body` aceita HTML. O backend deve **sanitizar** o HTML antes de persistir (remover `<script>`, atributos `on*`, iframes não autorizados). Recomendado: biblioteca `bleach` (Python).
- `slug` deve ser único. Em caso de conflito, o backend deve sufixar com um contador: `meu-artigo`, `meu-artigo-2`, `meu-artigo-3`.
- Artigos com `is_published = false` são rascunhos e não aparecem em nenhuma rota pública.

**Tags (M2M):**
```
tags
├── id      INTEGER       PK
├── name    VARCHAR(80)   NOT NULL UNIQUE
└── slug    VARCHAR(100)  NOT NULL UNIQUE

article_tags
├── article_id    INTEGER   FK → articles.id  ON DELETE CASCADE
└── tag_id        INTEGER   FK → tags.id      ON DELETE CASCADE
```

---

### 2.4 `AdminUser` — Usuário do painel

```
admin_users
├── id               INTEGER       PK
├── email            VARCHAR(255)  NOT NULL UNIQUE
├── hashed_password  VARCHAR(255)  NOT NULL       bcrypt, custo mínimo 12
├── is_active        BOOLEAN       DEFAULT true
└── created_at       TIMESTAMPTZ   DEFAULT now()
```

**Regras:**
- Senhas armazenadas exclusivamente como hash bcrypt. Nunca em texto plano.
- `is_active = false` desativa o acesso sem deletar o registro (soft disable).
- Não há sistema de roles por ora — qualquer `AdminUser` ativo tem acesso total ao painel.

---

### 2.5 `NewsletterSubscriber`

```
newsletter_subscribers
├── id          INTEGER       PK
├── email       VARCHAR(255)  NOT NULL UNIQUE
└── created_at  TIMESTAMPTZ   DEFAULT now()
```

**Regras:**
- Inscrição idempotente: se o e-mail já existe, retorna sucesso sem duplicar.
- Não há confirmação por e-mail implementada ainda (double opt-in é o próximo passo recomendado).

---

## 3. Queries críticas

### 3.1 Hero (destaque principal da homepage)

```sql
SELECT a.*, au.*, c.*
FROM articles a
JOIN authors au ON a.author_id = au.id
JOIN categories c ON a.category_id = c.id
WHERE a.is_published = true
ORDER BY a.published_at DESC
LIMIT 1;
```

Retorna o artigo mais recente publicado. Sempre 1 resultado.

---

### 3.2 Subdestaques (grade de 4 artigos)

```sql
SELECT a.*, au.*, c.*
FROM articles a
JOIN authors au ON a.author_id = au.id
JOIN categories c ON a.category_id = c.id
WHERE a.is_published = true
  AND a.id != :hero_id          -- exclui o hero
ORDER BY a.published_at DESC
LIMIT 4;
```

---

### 3.3 Feed cronológico

```sql
SELECT a.*, au.*, c.*
FROM articles a
JOIN authors au ON a.author_id = au.id
JOIN categories c ON a.category_id = c.id
WHERE a.is_published = true
  AND a.id NOT IN (:hero_id, :secondary_ids)   -- exclui já exibidos
ORDER BY a.published_at DESC
LIMIT :limit OFFSET :offset;
```

**Paginação:** baseada em `LIMIT / OFFSET`. Para feeds muito grandes, migrar para cursor-based pagination usando `published_at` + `id` como cursor composto.

---

### 3.4 Feed por categoria

```sql
SELECT a.*, au.*, c.*
FROM articles a
JOIN authors au ON a.author_id = au.id
JOIN categories c ON a.category_id = c.id
WHERE a.is_published = true
  AND c.slug = :category_slug
ORDER BY a.published_at DESC
LIMIT :limit OFFSET :offset;
```

---

### 3.5 Artigo por slug

```sql
SELECT a.*, au.*, c.*, t.*
FROM articles a
JOIN authors au ON a.author_id = au.id
JOIN categories c ON a.category_id = c.id
LEFT JOIN article_tags at ON a.id = at.article_id
LEFT JOIN tags t ON at.tag_id = t.id
WHERE a.slug = :slug
  AND a.is_published = true;
```

Carrega também as tags via LEFT JOIN.

---

### 3.6 Artigos relacionados

```sql
SELECT a.*, au.*, c.*
FROM articles a
JOIN authors au ON a.author_id = au.id
JOIN categories c ON a.category_id = c.id
WHERE a.is_published = true
  AND a.id != :current_id
  AND a.category_id = :current_category_id
ORDER BY a.published_at DESC
LIMIT 3;
```

Critério atual: mesma categoria. Pode ser evoluído para similaridade por tags.

---

### 3.7 Busca

```sql
SELECT a.*, au.*, c.*
FROM articles a
JOIN authors au ON a.author_id = au.id
JOIN categories c ON a.category_id = c.id
WHERE a.is_published = true
  AND (
    a.title ILIKE :q
    OR a.subtitle ILIKE :q
    OR a.chapeu ILIKE :q
  )
ORDER BY a.published_at DESC
LIMIT 8;
```

`:q` = `%termo%`. Para escala, substituir por Full-Text Search do PostgreSQL:

```sql
WHERE a.is_published = true
  AND to_tsvector('portuguese', a.title || ' ' || coalesce(a.subtitle,'') || ' ' || coalesce(a.body,''))
      @@ plainto_tsquery('portuguese', :q)
```

Adicionar coluna `search_vector TSVECTOR` com índice GIN e trigger para atualização automática.

---

## 4. Autenticação e autorização

### Fluxo de login

```
POST /admin/login
  │
  ├── Busca AdminUser por email
  ├── verify_password(plain, hashed)   ← passlib bcrypt
  ├── create_access_token({"sub": email})  ← JWT HS256
  └── response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,      ← JavaScript não acessa
        samesite="lax",     ← proteção CSRF básica
        secure=True         ← apenas HTTPS (produção)
      )
```

### Validação por rota protegida

```
Dependência: get_current_admin
  │
  ├── Lê cookie "access_token"
  ├── decode_token() via python-jose
  ├── Extrai "sub" (email) do payload
  └── Busca AdminUser ativo no banco
        └── Falhou? → HTTP 302 redirect para /admin/login
```

### Configurações JWT

| Parâmetro | Valor padrão | Observação |
|---|---|---|
| `ALGORITHM` | `HS256` | Simétrico, adequado para uso interno |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | 1 hora. Ajustar conforme necessidade |
| `SECRET_KEY` | lido do `.env` | Mínimo 32 bytes aleatórios. Nunca commitar |

### Upgrade para produção

- Implementar refresh token com rotação.
- Adicionar lista de tokens revogados (Redis) para suportar logout real.
- Considerar `secure=True` obrigatório no cookie quando HTTPS estiver ativo.

---

## 5. Sanitização de HTML

O campo `body` aceita HTML rico. Antes de persistir no banco, sanitize com `bleach`:

```python
import bleach

ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "s", "blockquote",
    "h2", "h3", "h4", "ul", "ol", "li",
    "a", "img", "figure", "figcaption",
    "iframe",  # apenas para embeds autorizados (ver abaixo)
]

ALLOWED_ATTRIBUTES = {
    "a":      ["href", "title", "target", "rel"],
    "img":    ["src", "alt", "width", "height", "loading"],
    "iframe": ["src", "width", "height", "allowfullscreen", "frameborder"],
    "*":      ["class", "id"],
}

def sanitize_body(html: str) -> str:
    return bleach.clean(html, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)
```

Iframes permitidos somente de origens confiáveis (YouTube, Spotify, SoundCloud). Adicionar validação de domínio no `src` do iframe.

---

## 6. Cálculo de tempo de leitura

```python
import math, re

def calculate_reading_time(html_body: str) -> int:
    text = re.sub(r"<[^>]+>", "", html_body)   # remove tags HTML
    words = len(text.split())
    return max(1, math.ceil(words / 200))       # 200 palavras/min
```

Chamar antes de persistir o artigo. Recalcular sempre que `body` for atualizado.

---

## 7. Geração de slugs

```python
import re
import unicodedata

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


async def unique_slug(db: AsyncSession, base: str, model) -> str:
    slug = slugify(base)
    candidate = slug
    counter = 2
    while True:
        exists = await db.execute(select(model).where(model.slug == candidate))
        if not exists.scalars().first():
            return candidate
        candidate = f"{slug}-{counter}"
        counter += 1
```

---

## 8. Índices recomendados no PostgreSQL

```sql
-- Já criados via migration inicial
CREATE UNIQUE INDEX ON categories (slug);
CREATE UNIQUE INDEX ON authors (slug);
CREATE UNIQUE INDEX ON articles (slug);
CREATE INDEX ON articles (published_at DESC) WHERE is_published = true;
CREATE INDEX ON articles (category_id, published_at DESC) WHERE is_published = true;
CREATE INDEX ON admin_users (email);
CREATE INDEX ON newsletter_subscribers (email);

-- Adicionar na próxima migration (Full-Text Search)
ALTER TABLE articles ADD COLUMN search_vector TSVECTOR;
CREATE INDEX ON articles USING GIN (search_vector);

CREATE OR REPLACE FUNCTION articles_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('portuguese', coalesce(NEW.title, '')) ||
    to_tsvector('portuguese', coalesce(NEW.subtitle, '')) ||
    to_tsvector('portuguese', coalesce(NEW.chapeu, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_search_vector_trigger
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION articles_search_vector_update();
```

---

## 9. Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | `postgresql+asyncpg://user:pass@host:5432/db` |
| `SECRET_KEY` | Sim | String aleatória de mínimo 32 bytes |
| `ALGORITHM` | Não | Default: `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Não | Default: `60` |
| `DEBUG` | Não | Default: `True`. Desabilitar em produção |
| `SITE_NAME` | Não | Default: `Aurora PE` |
| `SITE_URL` | Não | Default: `http://localhost:8000` |
| `BUCKET_ENDPOINT_URL` | Não | Endpoint S3-compatible (ex: Railway). Vazio = upload de imagem desabilitado (retorna 500 controlado) |
| `BUCKET_NAME` | Não | Nome do bucket |
| `BUCKET_ACCESS_KEY_ID` | Não | Access key do bucket |
| `BUCKET_SECRET_ACCESS_KEY` | Não | Secret key do bucket |
| `BUCKET_REGION` | Não | Default: `auto` |
| `BUCKET_PUBLIC_URL_BASE` | Não | Base da URL pública usada para montar a URL retornada após o upload |

Gerar `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 10. Extensões futuras do backend

### 10.1 Upload de imagens

**Implementado.** Upload multipart direto pelo backend (não presigned URL):

```
Admin → POST /api/v1/admin/uploads (multipart/form-data, campo "file")
     → backend valida content-type e tamanho (≤8MB)
     → backend envia para o bucket via boto3 (put_object, rodado em threadpool)
     → resposta: {"url": "https://.../articles/<uuid>.<ext>"}
```

Detalhes:
- Endpoint protegido por `Depends(get_current_admin)`.
- Tipos aceitos: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Outros tipos retornam `400`.
- Tamanho máximo: 8MB. Acima disso retorna `400`.
- Chave do objeto: `articles/{uuid4().hex}{extensão}`.
- Implementação em `app/services/storage.py` (cliente `boto3` S3-compatible, construído a partir das env vars `BUCKET_*`; chamada síncrona do `boto3` rodada via `starlette.concurrency.run_in_threadpool`).
- Sem `BUCKET_ENDPOINT_URL` configurada, o endpoint responde `500` com mensagem clara ("Upload não configurado") em vez de quebrar — colar URL de imagem direto no formulário continua funcionando normalmente nesse cenário.
- Limpeza de arquivos órfãos no bucket (quando uma imagem é removida/substituída no formulário) **não é feita automaticamente** — fica como tarefa futura.

### 10.2 Newsletter (envio de e-mails)

Integrar com SendGrid ou Mailgun via HTTP API. Criar task assíncrona com Celery + Redis para disparo em batch:

```python
# services/newsletter.py
async def dispatch_newsletter(subject: str, html_content: str):
    subscribers = await get_all_subscribers(db)
    for batch in chunks(subscribers, 500):
        send_batch.delay(batch, subject, html_content)  # Celery task
```

### 10.3 Cache

Para artigos com alto volume de acessos, adicionar cache de resposta com Redis:

```python
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache

@router.get("/artigo/{slug}")
@cache(expire=300)  # cache de 5 minutos
async def article_page(...):
    ...
```

Invalidar o cache sempre que um artigo for editado ou publicado.

### 10.4 API REST (headless)

Se for necessário expor os dados para um app mobile ou outro frontend, criar um router separado:

```
/api/v1/articles          GET    lista paginada
/api/v1/articles/{slug}   GET    artigo por slug
/api/v1/categories        GET    lista de categorias
/api/v1/search?q=termo    GET    busca
```

Retornar JSON usando os Pydantic schemas em `app/schemas/`. A autenticação da API deve usar `Authorization: Bearer <token>` no header (não cookie).

### 10.5 Sistema de tags no admin

Atualmente tags existem no banco mas não há interface para vinculá-las a artigos. Implementar:

1. Rota `POST /admin/artigos/{id}/tags` — adicionar tag
2. Rota `DELETE /admin/artigos/{id}/tags/{tag_id}` — remover tag
3. Campo de autocomplete no formulário do artigo (HTMX + `/admin/tags/suggest?q=`)

### 10.6 Double opt-in para newsletter

```
1. Usuário submete e-mail  →  backend gera token único
2. Backend envia e-mail com link de confirmação
3. GET /newsletter/confirmar?token=xyz  →  backend ativa o subscriber
4. Adicionar campo: confirmed BOOLEAN DEFAULT false, confirm_token VARCHAR(64)
```

---

## 11. Checklist de segurança para produção

- [ ] `DEBUG=False` no `.env` de produção
- [ ] `SECRET_KEY` longa e aleatória, nunca commitada
- [ ] Cookie com `secure=True` (exige HTTPS)
- [ ] HTTPS ativo via Certbot / Cloudflare
- [ ] `body` dos artigos sanitizado com `bleach` antes de persistir
- [ ] PostgreSQL com usuário de permissões mínimas (não usar superuser)
- [ ] Rate limiting nas rotas de login e newsletter (`slowapi` ou Nginx `limit_req`)
- [ ] Backups automáticos do banco (ex: `pg_dump` diário para S3)
- [ ] Logs de acesso e erros centralizados (ex: Sentry para erros Python)
- [ ] Headers de segurança HTTP via Nginx: `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`

---

## 12. Convenções de código

| Aspecto | Convenção |
|---|---|
| Funções assíncronas | `async def` em tudo que toca o banco |
| ORM | SQLAlchemy 2.0 com `select()` explícito, `selectinload()` para relacionamentos |
| Sessão | Injetada via `Depends(get_db)` — nunca instanciada manualmente nas rotas |
| Erros HTTP | `raise HTTPException(status_code=..., detail=...)` |
| Redirecionamentos | `RedirectResponse(url=..., status_code=302)` |
| Respostas HTMX | `HTMLResponse(partial_html)` — sem wrapper de página |
| Schemas | Pydantic v2 em `app/schemas/` para validação de entrada na API |
| Migrations | Sempre via Alembic — nunca `Base.metadata.create_all()` em produção |
