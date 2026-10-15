# Validação da atualização 2.1.0

Validação realizada em Chromium headless com Playwright, em servidor HTTP local. A versão publicada no GitHub não foi modificada.

Verificados por interação real na interface:

- Abertura do PDF com 10 páginas.
- Criação e posicionamento de assinatura digitada.
- Aplicação de assinatura nas páginas 2 a 10 e contagem de elementos.
- Desfazer e refazer a aplicação em lote.
- Bloqueio de posição impedindo movimento pelo teclado.
- Salvar, conferir e aplicar modelo de preenchimento.
- Exportar somente páginas 2 a 4, reordenar 4 antes de 3 e girar a 2 em 90°.
- Recuperar rascunho após recarregar a página, incluindo os elementos e a organização.
- Gerar prévia e baixar o arquivo após renderização de todas as páginas.
- Layout em viewport de 390 × 844 sem transbordamento horizontal.
- Recuperação e exportação sem rede após o cache instalado.

O PDF exportado também foi inspecionado por um leitor independente: três páginas, ordem selecionada, rotação de 90° na primeira, leitura estrita bem-sucedida e ausência de criptografia.

Limites: não foram testados Safari/iOS, dispositivos Android físicos, PDFs de todos os fornecedores nem atualização entre todas as versões históricas do cache. A verificação interna confirma abertura e renderização com PDF.js, não uma validação formal completa do padrão PDF.
