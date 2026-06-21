const owners = [
  { id: "owner_001", name: "Marina Souza", rating: 4.8, phone: "+55 41 99999-9999" },
  { id: "owner_002", name: "Rafael Lima", rating: 4.6, phone: "+55 41 98888-1002" },
  { id: "owner_003", name: "Camila Rocha", rating: 4.9, phone: "+55 41 97777-1003" },
  { id: "owner_004", name: "Bruno Almeida", rating: 4.4, phone: "+55 41 96666-1004" },
  { id: "owner_005", name: "Leticia Moreira", rating: 4.7, phone: "+55 41 95555-1005" },
  { id: "owner_006", name: "Thiago Pereira", rating: 4.5, phone: "+55 41 94444-1006" }
];

const neighborhoods = [
  "Centro",
  "Batel",
  "Agua Verde",
  "Cabral",
  "Bigorrilho",
  "Portao",
  "Santa Felicidade",
  "Boqueirao",
  "Cristo Rei",
  "Juveve"
];

const types = ["APARTMENT", "HOUSE", "ROOM", "STUDIO"];
const amenitiesPool = [
  "Wi-Fi",
  "Garagem",
  "Elevador",
  "Portaria",
  "Academia",
  "Piscina",
  "Churrasqueira",
  "Lavanderia",
  "Ar-condicionado",
  "Varanda"
];

const titles = [
  "Apartamento amoblado cerca del centro",
  "Studio moderno no Batel",
  "Casa tranquila com quintal",
  "Quarto pratico perto do transporte",
  "Apartamento ensolarado com garagem",
  "Studio compacto mobiliado",
  "Casa familiar em rua calma",
  "Apartamento perto de supermercados",
  "Quarto individual com Wi-Fi",
  "Cobertura pequena com varanda"
];

function padId(value) {
  return String(value).padStart(3, "0");
}

function pickAmenities(index) {
  const first = index % amenitiesPool.length;
  const second = (index + 3) % amenitiesPool.length;
  const third = (index + 6) % amenitiesPool.length;
  return [...new Set([amenitiesPool[first], amenitiesPool[second], amenitiesPool[third]])];
}

const properties = Array.from({ length: 30 }, (_, rawIndex) => {
  const index = rawIndex + 1;
  const type = types[rawIndex % types.length];
  const neighborhood = neighborhoods[rawIndex % neighborhoods.length];
  const owner = owners[rawIndex % owners.length];
  const bedrooms = type === "ROOM" ? 1 : (rawIndex % 4) + 1;
  const bathrooms = type === "HOUSE" ? Math.min(3, bedrooms) : rawIndex % 3 === 0 ? 2 : 1;
  const price = 900 + ((rawIndex * 370) % 4100);
  const isFurnished = rawIndex % 2 === 0 || type === "STUDIO";
  const allowsPets = rawIndex % 3 !== 0;
  const createdDay = padId(((rawIndex % 20) + 1)).slice(1);
  const updatedDay = padId(((rawIndex % 14) + 10)).slice(1);
  const imageBase = `https://images.unsplash.com/photo-156${String(1000000 + rawIndex * 7919).slice(0, 7)}?auto=format&fit=crop&w=1200&q=80`;

  return {
    id: `prop_${padId(index)}`,
    title: titles[rawIndex % titles.length],
    description: `${typeLabel(type)} em ${neighborhood}, Curitiba, com acesso pratico a comercio, transporte e servicos do bairro.`,
    city: "Curitiba",
    neighborhood,
    address: `Rua ficticia ${neighborhood}, ${100 + index}`,
    price,
    currency: "BRL",
    type,
    bedrooms,
    bathrooms,
    areaM2: type === "ROOM" ? 18 + (rawIndex % 8) : 32 + rawIndex * 4,
    isFurnished,
    allowsPets,
    isAvailable: rawIndex !== 12 && rawIndex !== 24,
    distanceToCenterKm: Number((0.8 + (rawIndex % 12) * 0.7).toFixed(1)),
    images: [
      `${imageBase}&sig=${index}-1`,
      `${imageBase}&sig=${index}-2`
    ],
    owner,
    amenities: pickAmenities(rawIndex),
    createdAt: `2026-06-${createdDay}T10:00:00Z`,
    updatedAt: `2026-06-${updatedDay}T15:30:00Z`
  };
});

const seedContactRequests = [
  {
    id: "contact_001",
    propertyId: "prop_001",
    userName: "Josias",
    email: "josias@example.com",
    phone: "+55 41 99999-9999",
    message: "Ola, tenho interesse neste apartamento.",
    status: "SENT",
    createdAt: "2026-06-15T12:00:00Z"
  }
];

function typeLabel(type) {
  switch (type) {
    case "APARTMENT":
      return "Apartamento";
    case "HOUSE":
      return "Casa";
    case "ROOM":
      return "Quarto";
    case "STUDIO":
      return "Studio";
    default:
      return "Imovel";
  }
}

module.exports = {
  properties,
  seedContactRequests
};
