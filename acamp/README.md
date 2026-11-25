# ACAMP 2027

A landing page está em `index.html`. Os estilos usam a paleta global de `../colors.css` e o comportamento de rolagem está em `script.js`.

## Fotos do último Acamp

Adicione as fotos em `/acampPics` e depois liste-as em `photos.json`. Cada objeto deve ter:

```json
{
  "src": "../acampPics/nome-da-foto.jpg",
  "alt": "Descrição breve da foto",
  "caption": "Legenda opcional"
}
```

A ordem dos itens define as posições visuais: 0 e 1 no destaque inicial, 2 a 5 na galeria e 6 na seção de hospedagem. Os cartões têm um fallback visual enquanto não houver fotos cadastradas.

## Assets visuais

Os elementos visuais são carregados de `/vectors`:
- `DIA.png`
- `legacylogo.png`
- `legacylogo2.png`
- `STICKER.png`
- `LEGACY(TITLE).png`

As fontes ficam em `/fonts`; veja as instruções dessa pasta.

## Inscrições

O link do botão aponta para `./inscricoes/`. A página atual em `inscricoes/index.html` é apenas uma tela provisória; formulário, regras e integração de dados serão implementados na próxima etapa.


## Inscrições e administração

A página de inscrições utiliza um fluxo em quatro etapas em `inscricoes/index.html`, com lógica em `inscricoes/inscricoes.js`. O processamento dos dados é feito pela Edge Function `acamp-api` no projeto Supabase Legacy.

O painel administrativo fica em `adm/index.html`. O acesso é exclusivo para contas cadastradas no Supabase Auth e autorizadas na tabela `public.acamp_admin_emails`. Para autorizar uma pessoa:
1. Crie a conta em Supabase Auth (e-mail e senha).
2. Cadastre o mesmo e-mail na tabela `public.acamp_admin_emails`, com `ativo = true`.
3. A pessoa acessa `/acamp/adm/` e entra com essa conta.

Exemplo SQL para o responsável pelo projeto (substitua pelo e-mail aprovado):

```sql
insert into public.acamp_admin_emails (email, ativo)
values (lower('administrador@exemplo.com'), true)
on conflict (email) do update set ativo = excluded.ativo;
```

Os dados do formulário não são gravados diretamente pelo navegador nas tabelas: o navegador chama a Edge Function, que valida os campos e usa credenciais do servidor. As parcelas do carnê ficam individualizadas em `public.inscricao_parcelas`.

Para habilitar o checkout, configure a InfiniteTag da organização em `eventos.configuracoes.infinitepay_handle` (evento `acamp-2027`). A API Key da InfinitePay é opcional para criar links básicos e, caso seja usada para opções avançadas, deve ser cadastrada como segredo da Edge Function, nunca no front-end.
