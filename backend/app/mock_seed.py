import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from app.database import engine, Base, AsyncSessionLocal
from app.models.category import Category
from app.models.author import Author
from app.models.article import Article
from app.models.user import AdminUser
from app.services.auth import hash_password


async def seed_mock_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        if (await db.execute(select(Category.id).limit(1))).scalars().first():
            return

        categories = [
            Category(name="Política", slug="politica", description="Cobertura política do estado"),
            Category(name="Cultura", slug="cultura", description="A cena cultural pernambucana"),
            Category(name="Educação", slug="educacao", description="O futuro das nossas escolas"),
            Category(name="Cidades", slug="cidades", description="Urbanismo e vida nas cidades"),
        ]
        db.add_all(categories)
        await db.flush()

        authors = [
            Author(name="Maria Souza", slug="maria-souza", bio="Jornalista com 10 anos de experiência em política."),
            Author(name="Carlos Lima", slug="carlos-lima", bio="Especialista em cultura e entretenimento."),
            Author(name="Ana Clara", slug="ana-clara", bio="Interessada em urbanismo e sustentabilidade."),
        ]
        db.add_all(authors)
        await db.flush()

        admin = AdminUser(email="admin@aurorape.com.br", hashed_password=hash_password("admin123"))
        db.add(admin)

        articles_data = [
            {
                "title": "Os desafios da política em Pernambuco para 2026",
                "slug": "desafios-politica-pernambuco-2026",
                "subtitle": "Análise profunda sobre o cenário eleitoral que se aproxima.",
                "chapeu": "Eleições 2026",
                "body": "<p>A política em Pernambuco sempre foi um terreno fértil para grandes debates. Com a aproximação de 2026, as peças começam a se mover no tabuleiro.</p><p>Especialistas apontam que a fragmentação partidária pode ser um dos maiores desafios para os novos candidatos.</p>",
                "author_id": authors[0].id,
                "category_id": categories[0].id,
                "featured_image_url": "https://picsum.photos/seed/pol/1200/600",
            },
            {
                "title": "Carnaval de Olinda: Tradição que se renova",
                "slug": "carnaval-olinda-tradicao-renova",
                "subtitle": "Como os bonecos gigantes e o frevo continuam atraindo multidões.",
                "chapeu": "Cultura",
                "body": "<p>As ladeiras de Olinda já sentem o cheiro do frevo. O Carnaval de Olinda não é apenas uma festa, é um patrimônio que se reinventa a cada ano.</p><p>Este ano, novos blocos prometem trazer ainda mais cor para a Cidade Alta.</p>",
                "author_id": authors[1].id,
                "category_id": categories[1].id,
                "featured_image_url": "https://picsum.photos/seed/cul/1200/600",
            },
            {
                "title": "A importância do Recife Antigo para a tecnologia",
                "slug": "recife-antigo-tecnologia-porto-digital",
                "subtitle": "O Porto Digital e seu impacto na economia local.",
                "chapeu": "Inovação",
                "body": "<p>O Porto Digital transformou o Recife Antigo em um dos maiores hubs de tecnologia do Brasil.</p><p>Empresas globais agora dividem espaço com startups locais em um ecossistema vibrante.</p>",
                "author_id": authors[2].id,
                "category_id": categories[3].id,
                "featured_image_url": "https://picsum.photos/seed/tech/1200/600",
            },
            {
                "title": "Educação inclusiva: Novas diretrizes para escolas públicas",
                "slug": "educacao-inclusiva-escolas-publicas",
                "subtitle": "O que muda no currículo e na infraestrutura das escolas.",
                "chapeu": "Educação",
                "body": "<p>A inclusão é o pilar da nova reforma educacional. Garantir que todos os alunos tenham acesso a uma educação de qualidade é a meta prioritária.</p>",
                "author_id": authors[0].id,
                "category_id": categories[2].id,
                "featured_image_url": "https://picsum.photos/seed/edu/1200/600",
            },
            {
                "title": "A revitalização do Rio Capibaribe",
                "slug": "revitalizacao-rio-capibaribe",
                "subtitle": "Projetos buscam integrar o rio de volta à rotina dos recifenses.",
                "chapeu": "Cidades",
                "body": "<p>O Rio Capibaribe é a alma do Recife. Projetos de despoluição e novos parques lineares estão mudando a cara da cidade.</p>",
                "author_id": authors[2].id,
                "category_id": categories[3].id,
                "featured_image_url": "https://picsum.photos/seed/river/1200/600",
            },
            {
                "title": "A força do teatro independente no Agreste",
                "slug": "teatro-independente-agreste-pernambuco",
                "subtitle": "Grupos locais mantêm viva a cena artística no interior.",
                "chapeu": "Cultura",
                "body": "<p>Do sertão ao agreste, o teatro pernambucano floresce com produções autônomas que levam reflexão e arte às praças públicas.</p>",
                "author_id": authors[1].id,
                "category_id": categories[1].id,
                "featured_image_url": "https://picsum.photos/seed/theater/1200/600",
            },
        ]

        now = datetime.utcnow()
        for i, data in enumerate(articles_data):
            article = Article(
                **data,
                is_published=True,
                published_at=now - timedelta(days=i),
                reading_time_min=2 + i,
            )
            db.add(article)

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed_mock_data())
