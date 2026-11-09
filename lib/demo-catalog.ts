// Exemplos de apresentação. Não são gravados no banco nem vendidos no checkout.
const categoryNames = ["Mandalas", "Porta-chaves", "Incensários", "Velas aromáticas"];

const examples = [
  { id: "demo-mandala-aurora", name: "Mandala Aurora", category: 0, priceCents: 14900, widthCm: 45, heightCm: 45, material: "Cordão de algodão, madeira e contas", imageUrl: "assets/mandala-recorte.png", imagePosition: null, glbUrl: "assets/mandala-preview.glb", description: "Uma composição em tons de mostarda e terracota para acolher o ambiente. Inclui uma prévia 3D ilustrativa de 45 cm." },
  { id: "demo-mandala-luz", name: "Mandala Luz Serena", category: 0, priceCents: 22900, widthCm: 38, heightCm: 55, material: "Algodão cru, madeira e detalhes dourados", imagePosition: "50% 0%", description: "Mandala em tons naturais com franjas e detalhes delicados para uma parede especial." },
  { id: "demo-porta-chaves-sol", name: "Porta-chaves Sol do Lar", category: 1, priceCents: 8900, widthCm: 28, heightCm: 24, material: "Madeira, cordão de algodão e ganchos metálicos", imagePosition: "100% 0%", description: "Um toque de arte na entrada da casa, com cinco ganchos para organizar as chaves." },
  { id: "demo-porta-chaves-raizes", name: "Porta-chaves Raízes", category: 1, priceCents: 10900, widthCm: 32, heightCm: 28, material: "Madeira natural, algodão e metal", imagePosition: "100% 0%", description: "Organização com afeto: peça decorativa com textura de corda e acabamento amadeirado." },
  { id: "demo-incensario-ancestral", name: "Incensário Ancestral", category: 2, priceCents: 5900, widthCm: 14, heightCm: 22, material: "Cerâmica em terracota com pintura manual", imagePosition: "0% 100%", description: "Uma forma acolhedora em cerâmica para acompanhar seus momentos de pausa." },
  { id: "demo-incensario-luar", name: "Incensário Jardim de Luar", category: 2, priceCents: 7900, widthCm: 25, heightCm: 9, material: "Cerâmica em tons de areia e terracota", imagePosition: "100% 100%", description: "Incensário alongado com detalhes de lua e folhagens para compor um cantinho de tranquilidade." },
  { id: "demo-vela-lavanda", name: "Vela Mandala de Lavanda", category: 3, priceCents: 4900, widthCm: 9, heightCm: 8, material: "Cera vegetal, essência ilustrativa de lavanda e recipiente cerâmico", imageUrl: "assets/vela-aromatica-mandala.jpg", imagePosition: null, description: "Vela aromática em embalagem com mandala, imaginada com notas suaves de lavanda. Conteúdo ilustrativo: 180 g." },
  { id: "demo-vela-capim-limao", name: "Vela Mandala de Capim-limão", category: 3, priceCents: 6900, widthCm: 10, heightCm: 9, material: "Cera vegetal, essência ilustrativa de capim-limão e cerâmica", imageUrl: "assets/vela-aromatica-mandala.jpg", imagePosition: null, description: "Uma fragrância cítrica imaginada para trazer frescor, em recipiente com mandala e tampa. Conteúdo ilustrativo: 240 g." },
];

export function getDemoCatalog() {
  return {
    demo: true,
    categories: categoryNames.map((name, index) => ({
      id: `demo-category-${index}`, name, slug: ["mandalas", "porta-chaves", "incensarios", "velas-aromaticas"][index],
      description: "Categoria de demonstração", active: true, sortOrder: index,
    })),
    products: examples.map(item => ({
      ...item, categoryId: `demo-category-${item.category}`, category: categoryNames[item.category],
      slug: item.id, description: `${item.description} Produto fictício para demonstração; imagem e preço ilustrativos.`,
      depthCm: null, stockQuantity: 12, madeToOrder: false, status: "active", featured: item.id === "demo-mandala-aurora",
      imageUrl: item.imageUrl ?? "assets/catalogo-conceitual.png", glbUrl: item.glbUrl ?? "", usdzUrl: "", demo: true,
    })),
  };
}

export function isDemoProductId(id: unknown) {
  return typeof id === "string" && id.startsWith("demo-");
}
