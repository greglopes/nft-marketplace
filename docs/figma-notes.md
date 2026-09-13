# Notas do layout Figma (Frontend Challenge — "Kurio" NFT Marketplace)

Fonte: https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge (view-only, capturado via browser). Os 4 retratos (`assets/figma/`) foram baixados das URLs de imagem que o Figma carrega para renderizar o arquivo.

## Identidade visual
- Tema escuro marrom: fundo ~#15100C / #1A1410; cards/painéis ~#241B15 / #2A2019; bordas ~#3A2E24.
- Acento laranja/caramelo ~#D28E4B (botões preenchidos, preços, links ativos, underline de tab).
- Texto principal creme ~#F1E8DA; texto secundário ~#B89A7E; texto muted ~#8A7460.
- Tipografia 100% monoespaçada (estilo IBM Plex Mono / Space Mono). Títulos em caixa alta no hero.
- Botões: retângulo com raio pequeno (~4px), laranja com texto escuro; outline com borda laranja.
- Cards NFT: imagem quadrada com raio ~8px, nome (creme) e preço (laranja, bold), preço antigo riscado cinza.
- Card hover: badge "RARO" no canto superior esquerdo, 3 ícones circulares (carrinho, coração, lupa) no rodapé da imagem.

## Desktop / Início (1440)
Header: logo "KURIO" (esq), nav central: Início(ativo, underline laranja) · Mercado · Criadores · Aprenda; dir: lupa, carrinho com badge, botão "Entrar" laranja com ícone.
Hero (2 col): "Bem-vindo à Kurio" (label pequeno) / H1 "SEJA DONO DO FUTURO DA ARTE DIGITAL" / parágrafo laranja-claro / botão "EXPLORAR" / dots do carrossel (3) / imagem grande à direita com raio ~16px.
Catálogo (sidebar 260px + grid 3 col):
- Sidebar card: "Coleções": Arte digital (33), Fotografia (12), Música (65), Arte 3D (39), Colecionáveis (23), Generativa (17), Jogos (19), Assinaturas (13), Utilidade (18). "Faixa de preço": range slider duplo, "Preço: 0,02 - 12,30 ETH", botão "Aplicar". "Rede": Ethereum (119), Polygon (78), Solana (86).
- Card "NFT EM DESTAQUE" / "OFERTA LIMITADA" + imagem.
- Tabs: "Todos os NFTs" (ativo) · "Novos lançamentos" · "Em alta". Direita: "Ordenar por: Listados recentemente ▾".
- Grid 3x3 cards: Emerald Ape #042 1.19 ETH; Sage Nomad #009 1.69; Neon Vessel #552 1.99 (antigo 2.29); Cosmic Bloom #118 1.29; Violet Nomad #314 1.39; Ivory Baron #088 1.79; Golden Beat #207 0.99; Golden Frequency #071 0.59; Golden Signal #160 0.39.
- Paginação: 1 2 3 4 › (ativo laranja preenchido).
Banners (2): imagem esq + texto dir alinhado à direita: "Lançamentos gênesis de edição limitada" / "Arte digital selecionada e muito mais" + "Explorar →".
"Diário da Cunhagem" + subtítulo; 4 cards (imagem, "12 de setembro | Leitura de 6 min", título, descrição, "Ler mais →").
Footer: 3 colunas com círculo laranja (W/C/D): Segurança da carteira, Criadores em destaque, Alertas de lançamento + newsletter "Antecipe-se ao próximo lançamento" (input + "Enviar"). Barra: KURIO | "Feito para colecionadores, criadores e cultura" | contato@email.com | +55 11 4002 8922. Colunas: Meu perfil (Meu perfil, Minha coleção, Atividade, Estúdio do criador, Lista de interesse) · Central de ajuda (Central de ajuda, Como comprar NFTs, Carteira e segurança, Política do mercado, Denunciar item) · Coleções (Arte digital, Fotografia, Música, Arte 3D, Utilidade) · Redes sociais (fb ig tw in yt) + "Carteiras compatíveis" tags METAMASK · WALLETCONNECT · COINBASE. "© 2026 Kurio. Propriedade digital para todos."

## Desktop / Detalhes do NFT
Breadcrumb "Início / Mercado". Esq: coluna de 4 thumbs + imagem principal (ícone lupa). Dir: título "Emerald Ape #042", preço "1.19 ETH" laranja, ★★★★★ "19 avaliações de colecionadores", "Sobre este NFT:" + texto, "Edição:" chips 1/1 · 1/10 · (1/50 selecionado outline) · ABERTA, stepper − 1 +, botões "COMPRAR" (laranja) e "♡ Favoritar" (outline), "ID do token: #0042", "Coleção: Kurio Apes", "Atributos: Óculos, Esmeralda, Raro", "Compartilhar este NFT:" ícones.
Tabs "Detalhes do NFT" | "Avaliações de colecionadores (19)"; texto; blocos "Rede:", "Contrato:", "Direitos autorais:".
"Mais desta coleção" carrossel 5 cards + dots. Footer.

## Desktop / Carrinho de NFTs
Breadcrumb "Início / Mercado / Carrinho". Tabela: NFTs | Preço | Edições | Total | lixeira. Linhas com thumb, nome, "ID do token: #0042", stepper laranja. Dir: card "Resumo da carteira": "Código promocional" input + "Aplicar"; Subtotal 26.83 ETH; Desconto do lançamento (-) 00.00; Taxa de rede 0.016 ETH ("Taxa estimada"); Total 26.846 ETH; botão "Conectar e finalizar"; link "Continuar explorando". "Colecionadores também viram" carrossel. Footer.

## Desktop / Pagamento
Breadcrumb "Início / Mercado / Pagamento". "Perfil do colecionador" 2 col: Nome de exibição*, Nome de usuário*, Rede* (select), Nome do perfil*, Endereço da carteira* + "ENS ou carteira secundária (opcional)", Tipo de carteira* (select), Código de indicação*, E-mail*, Nome ENS* (prefixo ".eth" select), radio "Usar outra carteira?", textarea "Observação do colecionador (opcional)".
Dir: "Seus NFTs" (NFTs | Subtotal) linhas thumb/nome/id/(x 2)/preço; "Tem um código promocional? Aplique aqui"; Subtotal/Desconto/Taxa/Total; "Carteira e rede": radios [tags METAMASK·WALLETCONNECT·COINBASE] / MetaMask / Coinbase Wallet (selecionado, borda laranja); botão "Confirmar compra" full. Footer.

## Desktop / Confirmação de Pedido
Modal centralizado (fundo escuro): ícone envelope "THANK YOU"; "Seus NFTs agora estão na sua carteira"; linha: ID da transação 0xA91F_E82C | Data 29 Jul, 2026 | Total 26.846 ETH | Carteira MetaMask; "Detalhes da transação" (NFTs | Edições | Subtotal); Taxa de rede; Total; texto "Transação confirmada na Ethereum. A propriedade foi transferida para sua carteira conectada e registrada na rede."; botão "Ver no Etherscan"; barra laranja inferior; X fechar.

## Desktop / Login e Cadastro
Modal sobre a home: tabs "Entrar | Criar conta" (ativo laranja). Login: "Entre para gerenciar sua carteira, coleção e perfil de criador." · email · senha (olho) · "Esqueceu a senha?" · botão "Entrar" · "Ou continue com" · Google · Facebook. Cadastro: "Crie seu perfil de colecionador e conecte uma carteira quando quiser." · Nome de usuário · e-mail · Senha · Confirmar senha · "Criar conta" · social.

## Desktop / Perfil
Sidebar "Meu perfil": Dados do perfil (ativo, barra laranja esq), Carteiras, Atividade, Lista de interesse, Ofertas, Arquivos baixados, Suporte, Sair. Conteúdo "Perfil do colecionador": Nome de exibição*, Nome de usuário*, E-mail*, Nome ENS* (.eth), Apelido da carteira*, Avatar (círculo + "Alterar" + "Remover"); "Alterar senha": Senha atual, Nova senha, Confirmar nova senha; botão "Salvar".

## Desktop / Carteiras
Mesma sidebar (Carteiras ativo). "Carteira principal" + "Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados." + link "Adicionar". Form: Nome de exibição*, Apelido da carteira*, Rede*, Nome do perfil*, Endereço da carteira* + ENS secundário, Tipo de carteira*, Código de indicação*, E-mail*, Nome ENS*; botão "Salvar carteira". "Carteira secundária": "Você ainda não adicionou uma carteira secundária." + radio "Igual à carteira principal" + "Adicionar".

## Mobile (390)
- Início: busca "Explorar coleções" + botão filtro; hero card compacto (texto + imagem, dots); tabs; grid 2 col (masonry-ish); bottom nav (home, coração, FAB central laranja, carrinho, perfil).
- Detalhes: imagem full com voltar/coração; painel: título + "★ 4.8 (19)"; descrição; Edição chips; ID/Coleção/Atributos; "Qtd. − 1 +" + preço; botões "Comprar NFT" + ícone carrinho.
- Carrinho: header "Carrinho de NFTs" com voltar; itens (thumb, nome, "Edição: 1/50", preço, stepper); cupom + Aplicar; resumo; "Conectar e finalizar".
- Pagamento: "Pagamento com carteira"; "Carteira conectada" + "Trocar carteira"; opções Reserva (nova.kurio.eth, Rede Polygon) / Principal (0xA91F_E82C, Rede principal Ethereum); "Carteira e rede": WalletConnect / MetaMask / Coinbase Wallet (radio); "Total: 8.936 ETH"; "Confirmar compra".
- Login / Cadastro: tela cheia com logo "KURIO" centralizado, título, campos, botão, social, link "Novo na Kurio? Crie uma conta" / "Já tem uma conta? Entre".
