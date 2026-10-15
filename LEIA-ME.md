# PDF SIGN — atualização 2.1.0

A identidade do PDF Signer Pro foi preservada: marca, cores, tipografia, ícones, controles e processamento local. Este pacote é uma atualização do site publicado em https://yirmire.github.io/PDF-sign/.


## Recursos novos

- **Aplicar em várias páginas:** selecione um elemento já posicionado, indique `2-5, 8` ou `todas`, confira as prévias e aplique. A página de origem é preservada; páginas excluídas do arquivo final são ignoradas. A operação inteira pode ser desfeita.
- **Rascunho local:** guarda um documento por vez com o PDF, elementos, organização e nome final. Recuperação após recarregar a página. O interruptor de salvamento e o botão de exclusão permitem desativar e apagar o rascunho. A preferência de desativação é lembrada.
- **Exportação conferida:** abre e renderiza todas as páginas do PDF gerado antes do download. “Visualizar resultado” mostra o arquivo final e permite navegar pelas páginas antes de baixar. Essa verificação não substitui a revisão dos dados nem garante compatibilidade com todos os leitores.
- **Organizar páginas:** incluir/excluir do resultado, reordenar e girar em passos de 90°. O editor mantém os números do original; a prévia final mostra a organização escolhida. A organização também participa de Desfazer/Refazer.
- **Modelos:** salva até 20 conjuntos de elementos da página atual, com nome, textos e imagens, neste dispositivo. Prévia obrigatória antes de reaplicar; revise datas, nomes e valores.
- **Precisão:** guias de centro durante arraste, centralização horizontal, bloqueio de posição e preservação do ajuste pelas setas (Shift para 10 px).
- **Celular:** barra inferior com assinatura, modo navegar/editar e conferência; miniaturas recolhidas inicialmente e áreas de toque maiores.
- **Continuidade:** indicador de páginas editadas/excluídas, aviso de alterações não baixadas ao sair ou trocar o arquivo e atualização do aplicativo sem recarregar automaticamente um trabalho aberto.
- **Assinaturas digitadas longas:** ajuste do tamanho para não cortar o nome.
- **Dependências locais:** bibliotecas incluídas no pacote, disponíveis offline depois do primeiro carregamento completo e da instalação do cache.

## Privacidade e limites

O PDF não é enviado a um servidor pelo editor. Rascunhos, modelos e assinaturas salvas contêm dados sensíveis e ficam no armazenamento do navegador. Em computadores compartilhados, desative o rascunho e apague os modelos/assinaturas ao terminar. O armazenamento pode ser limpo pelo navegador; mantenha cópias baixadas. Abas anônimas não são armazenamento durável.

Assinaturas continuam sendo visuais, não assinaturas criptográficas. PDFs que exigem senha podem ser visualizados quando a senha é informada, mas a exportação permanece sujeita às limitações da biblioteca original. O editor não remove criptografia.

Reorganizar páginas cria um PDF novo. Marcadores, metadados e campos interativos do documento original podem não ser preservados nessa operação; confira a prévia e mantenha o original. Com a organização inalterada, o documento é salvo diretamente, preservando a estrutura original tanto quanto a biblioteca permite.

“Apagar rascunho” não apaga modelos nem a assinatura opcionalmente salva: há controles separados para cada um. Uma nova edição, com salvamento ativado, atualiza o único rascunho local.

## Arquivos

- `index.html`, `styles.css`, `app.js`: interface e funcionamento.
- `sw.js`: atualização e cache offline dos recursos do aplicativo.
- `manifest.webmanifest`, `icons/`: instalação e ícones preservados.
- `vendor/`: pdf-lib 1.17.1 e PDF.js 3.4.120, nas versões já usadas pelo site.
- `licenses/`: licenças dos componentes distribuídos.
- `tests/e2e.cjs`: teste de regressão usando um PDF sintético, sem dados pessoais.
