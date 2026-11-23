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
