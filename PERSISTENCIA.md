# Persist?ncia e publica??o

O app oferece dois modos. Sem credenciais, os chamados ficam no `localStorage` do navegador. Com Supabase configurado, o app autentica cada pessoa e salva os chamados na nuvem, com acesso isolado por usu?rio via RLS. Se j? houver chamados no armazenamento local e a conta ainda n?o tiver dados na nuvem, o app tenta import?-los no primeiro login.

## Configura??o inicial

1. Crie um projeto no Supabase.
2. No **SQL Editor** desse projeto, execute uma vez o arquivo [`supabase/schema.sql`](supabase/schema.sql). Isso cria a tabela `chamados` e suas pol?ticas de seguran?a.
3. Copie `.env.example` para `.env.local` na raiz do projeto e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a URL e a chave p?blica (publishable/anon) em **Project Settings ? API Keys**.
4. Reinicie `pnpm dev` e crie sua conta pela tela do app.

A etapa do SQL ? necess?ria uma ?nica vez: a chave p?blica usada no navegador n?o tem permiss?o para criar tabelas. Depois dela, no desenvolvimento e na hospedagem, basta configurar as duas vari?veis de ambiente. Se a confirma??o de e-mail estiver ativa no Supabase, confirme o endere?o antes de entrar.

N?o use a chave `service_role` no navegador. O acesso ? limitado pelas pol?ticas RLS do arquivo SQL.
