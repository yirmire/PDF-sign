# PDF Signer Pro v2

Editor de PDF executado no navegador para adicionar:

- assinatura desenhada, digitada ou importada;
- texto, data e iniciais;
- marcação e carimbo;
- elementos arrastáveis, redimensionáveis e giratórios;
- miniaturas, zoom e navegação entre páginas;
- desfazer/refazer;
- exportação com coordenadas normalizadas por página;
- suporte a páginas de tamanhos, orientações e rotações diferentes;
- instalação como PWA e cache para uso após a primeira abertura.

## Aviso jurídico

A aplicação adiciona uma representação visual de assinatura. Não implementa certificado digital ICP-Brasil, assinatura PAdES ou assinatura criptográfica.

## Dependências

As versões estão fixadas no `index.html`:

- pdf-lib 1.17.1
- PDF.js 3.4.120

Na primeira abertura é necessária conexão para carregar essas bibliotecas. O service worker passa a armazená-las no cache do navegador para as próximas utilizações.

## Limitações conhecidas

- Textos são exportados usando Helvetica/Helvetica Bold do PDF. Caracteres fora do conjunto latino básico são substituídos por `?`.
- PDFs com restrições criptográficas de edição podem não permitir a exportação.
- A primeira execução offline não funciona porque as bibliotecas externas ainda não estarão no cache.
