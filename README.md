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

## Publicar no GitHub Pages

1. Copie todos os arquivos desta pasta para o repositório.
2. Faça commit e push para a branch principal.
3. Em **Settings → Pages**, publique a branch e a pasta raiz.
4. Aguarde a URL do GitHub Pages atualizar.

Os caminhos são relativos e funcionam em subpastas do GitHub Pages.

## Desenvolvimento local

Por causa do service worker e das políticas do navegador, abra por um servidor HTTP local, não diretamente com `file://`.

Exemplos:

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Dependências

As versões estão fixadas no `index.html`:

- pdf-lib 1.17.1
- PDF.js 3.4.120

Na primeira abertura é necessária conexão para carregar essas bibliotecas. O service worker passa a armazená-las no cache do navegador para as próximas utilizações.

## Testes recomendados antes da publicação

- PDF A4 em retrato e paisagem;
- documento com páginas de tamanhos diferentes;
- páginas com rotação interna de 90°, 180° e 270°;
- assinatura desenhada, digitada e PNG transparente;
- arrastar, redimensionar e girar elementos;
- exportação em computador e celular;
- PDF protegido por senha;
- PDF corrompido e arquivo maior que 40 MB;
- navegação apenas pelo teclado.

## Limitações conhecidas

- Textos são exportados usando Helvetica/Helvetica Bold do PDF. Caracteres fora do conjunto latino básico são substituídos por `?`.
- PDFs com restrições criptográficas de edição podem não permitir a exportação.
- A primeira execução offline não funciona porque as bibliotecas externas ainda não estarão no cache.
