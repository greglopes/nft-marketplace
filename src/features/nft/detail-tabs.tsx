import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Nft } from '@/lib/api/contracts'

const tabTrigger = 'flex-none rounded-none px-0 py-2 text-xs text-foreground/80 after:bg-primary data-[state=active]:text-primary'

export function DetailTabs({ nft }: { nft: Nft }) {
  return (
    <Tabs defaultValue="details" className="mt-8">
      <TabsList variant="line" className="h-auto w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0 pb-1">
        <TabsTrigger value="details" className={tabTrigger}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={tabTrigger}>
          Avaliações de colecionadores ({nft.reviewsCount})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="space-y-3 pt-4 text-xs leading-relaxed text-warm">
        <p>{nft.description}</p>
        <p>A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. {nft.creator} recebe {nft.royaltyPct}% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.</p>
        <dl className="space-y-2">
          <div>
            <dt className="font-semibold text-foreground">Rede:</dt>
            <dd>Cunhado na {nft.network === 'ethereum' ? 'Ethereum' : nft.network === 'polygon' ? 'Polygon' : 'Solana'} com procedência imutável e metadados armazenados no IPFS.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Contrato:</dt>
            <dd>Direitos autorais do criador: {nft.royaltyPct}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Direitos autorais:</dt>
            <dd>{nft.contract} · Contrato inteligente ERC-721 verificado.</dd>
          </div>
        </dl>
      </TabsContent>
      <TabsContent value="reviews" className="pt-4 text-xs text-warm">
        <p>
          {nft.reviewsCount} colecionadores avaliaram esta obra com média {nft.rating.toFixed(1)} de 5. As avaliações completas ficam fora do escopo desta entrega.
        </p>
      </TabsContent>
    </Tabs>
  )
}
