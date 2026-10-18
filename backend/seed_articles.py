"""
Seed não-destrutivo: insere artigos reais + banner hero Palestina no demo.db existente.
Usa get-or-create para categorias e autor — não apaga dados existentes.
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.models.category import Category
from app.models.author import Author
from app.models.article import Article

from app.config import DATABASE_URL
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_or_create_category(db: AsyncSession, name: str, slug: str, description: str = "") -> Category:
    result = await db.execute(select(Category).where(Category.slug == slug))
    cat = result.scalars().first()
    if not cat:
        cat = Category(name=name, slug=slug, description=description)
        db.add(cat)
        await db.flush()
    return cat


async def get_or_create_author(db: AsyncSession, name: str, slug: str, bio: str = "") -> Author:
    result = await db.execute(select(Author).where(Author.slug == slug))
    author = result.scalars().first()
    if not author:
        author = Author(name=name, slug=slug, bio=bio)
        db.add(author)
        await db.flush()
    return author


async def article_exists(db: AsyncSession, slug: str) -> bool:
    result = await db.execute(select(Article.id).where(Article.slug == slug))
    return result.scalars().first() is not None


async def seed():
    async with AsyncSessionLocal() as db:
        # ── Categorias ─────────────────────────────────────────────────────────
        cat_sindical = await get_or_create_category(
            db, "Agenda Sindical", "agenda-sindical", "Cobertura sindical e trabalhista"
        )
        cat_cultura = await get_or_create_category(
            db, "Cultura", "cultura", "A cena cultural pernambucana"
        )
        cat_politica = await get_or_create_category(
            db, "Política", "politica", "Cobertura política do estado"
        )
        cat_mundo = await get_or_create_category(
            db, "Mundo", "mundo", "Notícias internacionais"
        )

        # ── Autor ───────────────────────────────────────────────────────────────
        denilson = await get_or_create_author(
            db,
            "Denilson Miatto",
            "denilson-miatto",
            "Jornalista da redação do Aurora PE.",
        )

        # ── Artigos ─────────────────────────────────────────────────────────────
        now = datetime.utcnow()

        articles = [
            # Artigo 0 — Hero Palestina (published_at mais recente → aparece no hero)
            {
                "title": "Genocídio em Gaza: mais de 57 mil mortos e bloqueio humanitário persistem após 21 meses de guerra",
                "slug": "genocidio-gaza-mortos-bloqueio-humanitario-2025",
                "chapeu": "Palestina",
                "subtitle": "ONU alerta para colapso do sistema de saúde e fome em massa enquanto bloqueio total impede entrada de alimentos e medicamentos",
                "body": (
                    "<p>A guerra em Gaza, iniciada em outubro de 2023, já contabiliza mais de 57 mil mortos palestinos, "
                    "segundo dados do Ministério da Saúde do território. A maioria das vítimas são civis, incluindo mulheres "
                    "e crianças. O conflito entrou em seu segundo ano com perspectivas de cessar-fogo ainda incertas e a "
                    "situação humanitária classificada pela ONU como catastrófica.</p>"
                    "<p>O sistema de saúde de Gaza está praticamente destruído, com hospitais funcionando abaixo da "
                    "capacidade mínima e escassez crítica de medicamentos e equipamentos. A UNRWA, agência da ONU para "
                    "refugiados palestinos, registra que a maioria dos 2,3 milhões de habitantes se encontra em situação "
                    "de deslocamento forçado.</p>"
                    "<h2>Bloqueio total e fome como arma de guerra</h2>"
                    "<p>O bloqueio imposto ao território limita drasticamente a entrada de alimentos, água e combustível. "
                    "Organizações humanitárias denunciam que a população civil enfrenta níveis alarmantes de insegurança "
                    "alimentar, com áreas do norte de Gaza classificadas na fase 5 do IPC — o nível mais grave de fome, "
                    "caracterizado como catástrofe alimentar.</p>"
                    "<p>O Tribunal Internacional de Justiça (TIJ) determinou que Israel tome medidas para garantir a entrada "
                    "de ajuda humanitária. No entanto, organizações de direitos humanos relatam que as ordens não têm sido "
                    "cumpridas. A Corte Penal Internacional emitiu mandados de prisão contra líderes israelenses por crimes "
                    "de guerra.</p>"
                    "<h2>Solidariedade internacional e mobilizações</h2>"
                    "<p>Ao redor do mundo, milhões de pessoas foram às ruas em manifestações de solidariedade ao povo "
                    "palestino. Movimentos de boicote a empresas que apoiam Israel cresceram em vários países. No Brasil, "
                    "o governo Lula reconheceu o Estado Palestino e classificou as operações militares israelenses como "
                    "violações do direito internacional humanitário.</p>"
                    "<p>A pressão internacional cresce com países europeus e nações do Sul Global exigindo um cessar-fogo "
                    "permanente e o início de uma solução política baseada no direito à autodeterminação do povo palestino "
                    "e na criação de um Estado Palestino livre e soberano.</p>"
                    "<blockquote>Da Palestina para Pernambuco: resistência é a palavra que une os povos que lutam por "
                    "dignidade e justiça.</blockquote>"
                    "<p>O Aurora PE acompanha de perto as mobilizações em Recife e Pernambuco em solidariedade ao povo "
                    "palestino, e reafirma seu compromisso com o jornalismo que dá voz aos que lutam contra o "
                    "colonialismo e a opressão.</p>"
                ),
                "featured_image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Flag_of_Palestine%2C_WFB_2004.svg/2560px-Flag_of_Palestine%2C_WFB_2004.svg.png",
                "category_id": cat_mundo.id,
                "author_id": denilson.id,
                "reading_time_min": 5,
                "published_at": now,
            },
            # Artigo 1 — Escala 6x1
            {
                "title": "Centro do Recife recebe mobilização nacional pelo fim da escala 6x1",
                "slug": "centro-recife-mobilizacao-escala-6x1",
                "chapeu": "Agenda Sindical",
                "subtitle": "Mobilizações em diferentes regiões do país buscam pressionar o Senado Federal para avanço da PEC nº 221 que defende redução da jornada de trabalho",
                "body": (
                    "<p>Mobilizações e atos públicos em diferentes regiões do país tomaram conta das ruas nesta "
                    "terça-feira (30) em defesa da redução da jornada de trabalho e do fim da escala 6x1. "
                    "Convocados pelas Frentes Brasil Popular e Povo Sem Medo, pela CUT, pelo Fórum das Centrais "
                    "Sindicais e pelo movimento Vida Além do Trabalho (VAT), os atos buscam ampliar a pressão "
                    "sobre o Senado Federal para que avance a tramitação da Proposta de Emenda à Constituição "
                    "(PEC) nº 221.</p>"
                    "<p>No Recife, a mobilização ocorreu a partir das 09h, com panfletagem no cruzamento da "
                    "Avenida Conde da Boa Vista com a Rua Gervásio Pires, no bairro da Boa Vista. A atividade "
                    "reuniu dirigentes sindicais e militantes em diálogo com a população sobre a importância da "
                    "redução da jornada de trabalho para 40 horas semanais, sem redução salarial.</p>"
                    "<h3>Posicionamento da CUT Pernambuco</h3>"
                    "<p>O secretário-geral da CUT Pernambuco, Hélcio Alfredo, destacou que \"chegou o momento "
                    "de a classe trabalhadora unir forças para conquistar essa pauta legítima\".</p>"
                    "<p>Alfredo enfatizou que parlamentares mantêm rotina reduzida de trabalho enquanto impõem "
                    "aos trabalhadores \"uma jornada exaustiva de até 52 horas semanais\". Destacou que em "
                    "setores como indústria, construção civil e comércio, \"a classe trabalhadora enfrenta um "
                    "nível de desgaste que exige uma mudança estrutural urgente\".</p>"
                    "<h3>Continuidade das ações</h3>"
                    "<p>A programação em Pernambuco prosseguiu com novas ações de panfletagem às 15h, no mesmo "
                    "cruzamento da Avenida Conde da Boa Vista com a Rua Gervásio Pires, e na Estação Recife "
                    "do Metrô.</p>"
                    "<p>A CUT Pernambuco, as Frentes Brasil Popular e Povo Sem Medo e o movimento VAT também "
                    "convocam para mobilização virtual em defesa da proposta. A população pode pressionar "
                    "parlamentares através da plataforma Na Pressão (napressao.org.br), que permite enviar "
                    "mensagens aos senadores sobre pautas de interesse da classe trabalhadora.</p>"
                ),
                "featured_image_url": "https://picsum.photos/seed/sindical6x1/1200/600",
                "category_id": cat_sindical.id,
                "author_id": denilson.id,
                "reading_time_min": 4,
                "published_at": now - timedelta(hours=3),
            },
            # Artigo 2 — Bonecos Gigantes
            {
                "title": "Projeto Amantes do Carnaval pauta valorização e visibilidade para a cultura dos bonecos gigantes de Pernambuco",
                "slug": "projeto-amantes-carnaval-bonecos-gigantes-pernambuco",
                "chapeu": "Cultura",
                "subtitle": "Iniciativa nascida em 2019 oferece visibilidade a bonecos gigantes que não possuem recursos para participar dos desfiles oficiais",
                "body": (
                    "<p>O projeto Amantes do Carnaval nasceu em 2019 a partir de uma inquietação de seus "
                    "idealizadores diante de uma realidade pouco conhecida pelo grande público. Durante a "
                    "tradicional Quarta-feira de Cinzas, ao participarem do Bacalhau do Batata, em Olinda, "
                    "eles observaram a presença de diversos bonecos gigantes que não haviam participado dos "
                    "dias oficiais de Carnaval. A curiosidade sobre aquela ausência revelou uma situação "
                    "recorrente, a de que muitos proprietários e agremiações não possuíam recursos financeiros "
                    "para custear despesas como orquestras, passistas, clarins e toda a estrutura necessária "
                    "para colocar seus bonecos nas ruas.</p>"
                    "<p>A partir daí surgiu a ideia de criar uma iniciativa que oferecesse visibilidade a esses "
                    "personagens da cultura popular pernambucana. Foi então que em 2020, antes mesmo da "
                    "realização do cortejo carnavalesco planejado, os organizadores decidiram levar os bonecos "
                    "para as celebrações juninas. Muitos deles inspirados em personagens tradicionais do "
                    "imaginário nordestino, como noivos, padre, Lampião e Maria Bonita, os bonecos ganharam "
                    "novas caracterizações e passaram a integrar um grande cortejo cultural durante o período "
                    "de São João. Nascia assim o Cortejo Junino dos Amantes do Carnaval.</p>"
                    "<p>Ao longo dos anos, diversos bonecos que antes permaneciam sem desfilar por falta de "
                    "recursos passaram a ser conhecidos pelo público, participando de eventos culturais, "
                    "promovendo suas próprias festividades e fortalecendo suas relações com as comunidades "
                    "onde estão inseridos. Dessa forma, o projeto atua como um importante instrumento de "
                    "democratização cultural, valorização da memória popular e incentivo à continuidade das "
                    "tradições carnavalescas e juninas.</p>"
                    "<p>Desde 2020, os Amantes do Carnaval participam do tradicional Encontro de Bonecos "
                    "Gigantes idealizado pelo artista e produtor cultural Ciro Botelho, em Olinda. Todos os "
                    "anos, uma ala formada por bonecos ligados ao projeto participa do desfile, fortalecendo "
                    "ainda mais a presença e a diversidade dessa expressão artística durante o período "
                    "carnavalesco.</p>"
                    "<p>Os Amantes do Carnaval representam, acima de tudo, um movimento de resistência "
                    "cultural, inclusão e celebração da identidade pernambucana. Por meio de seus cortejos, "
                    "encontros e ações comunitárias, o projeto mantém viva a magia dos bonecos gigantes e "
                    "garante que essa tradição continue encantando novas gerações.</p>"
                ),
                "featured_image_url": "https://picsum.photos/seed/carnaval2019/1200/600",
                "category_id": cat_cultura.id,
                "author_id": denilson.id,
                "reading_time_min": 4,
                "published_at": now - timedelta(hours=6),
            },
            # Artigo 3 — Alice Gabino
            {
                "title": "Alice Gabino dá spoiler sobre candidatura no lançamento do Quilombo nos Parlamentos em Recife",
                "slug": "alice-gabino-candidatura-quilombo-parlamentos-recife",
                "chapeu": "Política",
                "subtitle": "Advogada e ativista da Rede Sustentabilidade participa de audiência pública sobre PEC da Reparação",
                "body": (
                    "<p>A advogada, ativista do movimento negro e dirigente da Rede Sustentabilidade, Alice "
                    "Gabino, participou nesta quinta-feira (18), na Assembleia Legislativa de Pernambuco "
                    "(Alepe), da audiência pública que marcou o lançamento da iniciativa Quilombo nos "
                    "Parlamentos em Pernambuco. O evento integrou a mobilização nacional em torno da chamada "
                    "PEC da Reparação, proposta que busca ampliar o debate sobre justiça histórica, reparação "
                    "e direitos da população negra brasileira.</p>"
                    "<p>Organizada pela Coalizão Negra por Direitos e por diversas entidades do movimento "
                    "negro pernambucano, a atividade reuniu lideranças políticas, ativistas, parlamentares e "
                    "pré-candidatos apoiados pelo movimento negro unificado. Além de discutir os caminhos para "
                    "a aprovação da PEC da Reparação, a audiência também serviu como espaço para apresentação "
                    "de lideranças comprometidas com pautas antirracistas e de fortalecimento da representação "
                    "negra nos espaços de poder.</p>"
                    "<p>Durante o encontro, os participantes debateram a necessidade de enfrentar as "
                    "desigualdades estruturais produzidas por séculos de escravidão e exclusão social. A "
                    "proposta da PEC da Reparação tem como eixo central a construção de mecanismos concretos "
                    "de reparação histórica à população negra, tema que vem ganhando força em diferentes "
                    "estados brasileiros por meio de audiências públicas e mobilizações populares.</p>"
                    "<p>Em sua intervenção, Alice Gabino foi além do debate sobre reparação racial e aproveitou "
                    "o momento para enviar um recado ao cenário político de Pernambuco.</p>"
                    "<blockquote>\"Tive que colocar o meu nome para que quem está hoje como pré-candidato ao "
                    "Senado não faça o trabalho que Túlio está fazendo para a direita e para a extrema-direita. "
                    "Quero dizer a vocês que estarei como vice de novo, a vice do povo. Estarei como vice da "
                    "Rede, do PSOL, fechada com o companheiro Ivan Moraes\"</blockquote>"
                    "<p>A audiência pública reforçou ainda a importância da articulação entre movimentos "
                    "sociais e representação institucional. Reunindo diferentes correntes do movimento negro, "
                    "para sinalizar que a pauta da reparação histórica deverá ocupar espaço relevante no "
                    "debate político dos próximos meses.</p>"
                ),
                "featured_image_url": "https://picsum.photos/seed/politica-alice/1200/600",
                "category_id": cat_politica.id,
                "author_id": denilson.id,
                "reading_time_min": 4,
                "published_at": now - timedelta(hours=9),
            },
        ]

        inserted = 0
        skipped = 0
        for data in articles:
            if await article_exists(db, data["slug"]):
                print(f"  [skip] já existe: {data['slug']}")
                skipped += 1
                continue
            article = Article(
                title=data["title"],
                slug=data["slug"],
                chapeu=data.get("chapeu"),
                subtitle=data.get("subtitle"),
                body=data["body"],
                featured_image_url=data.get("featured_image_url"),
                author_id=data["author_id"],
                category_id=data["category_id"],
                reading_time_min=data.get("reading_time_min", 3),
                is_published=True,
                published_at=data["published_at"],
            )
            db.add(article)
            inserted += 1

        await db.commit()
        print(f"\nConcluido: {inserted} artigo(s) inserido(s), {skipped} ja existia(m).")


if __name__ == "__main__":
    asyncio.run(seed())
