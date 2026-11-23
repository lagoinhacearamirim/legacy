# Fontes do projeto

Os arquivos oficiais enviados para a identidade visual estão nesta pasta e são carregados diretamente pelo CSS com `@font-face`. Os nomes originais foram preservados:

- `Modesto Condensed.ttf` — fonte de títulos e chamadas (`--font-display`)
- `Behover College.otf` — fonte de destaque e frases expressivas (`--font-accent`)
- `CartographCF-ExtraBold.ttf` — pesos fortes e elementos de marca (`--font-heavy`)
- `HelveticaLTStd-BoldCond.otf` — textos curtos, etiquetas e metadados condensados (`--font-condensed`)

Os formatos TTF e OTF são compatíveis com navegadores modernos. Não é necessário converter os arquivos para WOFF2 para esta versão do projeto. Caso novos pesos ou estilos sejam enviados, atualize os respectivos blocos `@font-face` em `acamp/styles.css`.
