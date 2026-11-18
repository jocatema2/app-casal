# A Dois

Web app para gerir o dia a dia a dois: despesas partilhadas (com saldo de quem deve a quem), tarefas e stock da casa com lista de compras.

**App:** <https://jocatema2.github.io/app-casal/>

Site estático, sem build: HTML, CSS e JavaScript. Os dados e o login ficam no [Supabase](https://supabase.com) (plano gratuito).

## Experimentar no computador

```bash
python3 -m http.server 5173
```

Abre <http://localhost:5173>. Sem base de dados configurada, a app corre em **modo de demonstração**: dados de exemplo guardados só nesse browser.

## Ligar a base de dados (uma vez)

1. Cria uma conta e um projeto em <https://supabase.com> (região Europa).
2. **SQL Editor** → cola o conteúdo de [`supabase/schema.sql`](supabase/schema.sql), **troca os dois emails de exemplo pelos vossos** e carrega em Run.
3. **Authentication → Users → Add user**: cria um utilizador para cada um (email + palavra-passe, com "Auto Confirm User").
4. **Authentication → Sign In / Providers**: desliga "Allow new users to sign up".
5. **Project Settings → API**: copia o *Project URL* e a chave *anon / publishable* para [`js/config.js`](js/config.js).

No primeiro login, cada um escolhe o seu nome e as suas cores. A palavra-passe pode ser mudada na app, no ecrã da conta (toque no avatar).

### Segurança

A chave em `js/config.js` é pública por natureza e pode estar no GitHub. O que protege os dados são as regras do `schema.sql`: só os emails da tabela `members` conseguem ler ou escrever. Nunca ponhas a chave `service_role` no código.

O plano gratuito do Supabase pausa projetos sem atividade durante uma semana; basta reativá-lo no painel.

## Publicar no GitHub Pages

1. Cria um repositório e faz push destes ficheiros para o ramo `main`.
2. No repositório: **Settings → Pages → Source: Deploy from a branch**, ramo `main`, pasta `/ (root)`.
3. A app fica em `https://<utilizador>.github.io/<repositório>/`.

No telemóvel, usa "Adicionar ao ecrã principal" para a abrir como uma app.

## Estrutura

| Ficheiro | O que faz |
| --- | --- |
| `index.html`, `css/styles.css` | Página e estilos |
| `js/app.js` | Ecrãs e interações |
| `js/store.js` | Dados: Supabase ou modo de demonstração |
| `js/config.js` | URL e chave do Supabase |
| `supabase/schema.sql` | Tabelas e regras de acesso |
