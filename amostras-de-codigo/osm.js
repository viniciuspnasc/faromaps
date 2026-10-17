// Comércios ao redor pelo OpenStreetMap (Overpass API): grátis, sem chave e sem cartão.
const SERVIDORES = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];

const NOMES = {
  // amenity
  restaurant: 'Restaurante', cafe: 'Café', fast_food: 'Lanchonete', bar: 'Bar', pub: 'Bar', ice_cream: 'Sorveteria', food_court: 'Praça de alimentação',
  pharmacy: 'Farmácia', dentist: 'Dentista', clinic: 'Clínica', doctors: 'Consultório médico', veterinary: 'Veterinário', car_wash: 'Lava-rápido',
  fuel: 'Posto de combustível', driving_school: 'Autoescola', marketplace: 'Feira/mercado',
  // shop
  bakery: 'Padaria', butcher: 'Açougue', confectionery: 'Doceria', pastry: 'Confeitaria', deli: 'Empório', greengrocer: 'Hortifrúti', beverages: 'Bebidas',
  alcohol: 'Adega', supermarket: 'Supermercado', convenience: 'Conveniência', hairdresser: 'Cabeleireiro/Barbearia', beauty: 'Salão de beleza',
  cosmetics: 'Cosméticos', tattoo: 'Estúdio de tatuagem', massage: 'Massagem', clothes: 'Loja de roupas', shoes: 'Calçados', boutique: 'Boutique',
  fashion_accessories: 'Acessórios', jewelry: 'Joalheria', optician: 'Ótica', chemist: 'Drogaria', medical_supply: 'Artigos médicos', pet: 'Pet shop',
  florist: 'Floricultura', gift: 'Presentes', books: 'Livraria', stationery: 'Papelaria', copyshop: 'Gráfica/copiadora', mobile_phone: 'Celulares',
  electronics: 'Eletrônicos', computer: 'Informática', furniture: 'Móveis', hardware: 'Material de construção', doityourself: 'Material de construção',
  paint: 'Tintas', car_repair: 'Oficina mecânica', car: 'Concessionária', car_parts: 'Autopeças', tyres: 'Borracharia', motorcycle: 'Motos',
  bicycle: 'Bicicletaria', laundry: 'Lavanderia', dry_cleaning: 'Lavanderia', tailor: 'Costureira', variety_store: 'Variedades', kiosk: 'Banca',
  sports: 'Artigos esportivos', toys: 'Brinquedos', bag: 'Bolsas', perfumery: 'Perfumaria', nutrition_supplements: 'Suplementos', tobacco: 'Tabacaria',
  photo: 'Fotografia', music: 'Música', locksmith: 'Chaveiro', interior_decoration: 'Decoração', bed: 'Colchões', baby_goods: 'Artigos infantis',
  // office / leisure / craft
  lawyer: 'Advocacia', accountant: 'Contabilidade', estate_agent: 'Imobiliária', insurance: 'Seguros', travel_agent: 'Agência de viagens',
  fitness_centre: 'Academia', sports_centre: 'Centro esportivo', electrician: 'Eletricista', plumber: 'Encanador', shoemaker: 'Sapateiro',
};

const GRUPO_DE = {
  comida: ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'ice_cream', 'food_court', 'bakery', 'butcher', 'confectionery', 'pastry', 'deli', 'greengrocer', 'beverages', 'alcohol'],
  beleza: ['hairdresser', 'beauty', 'cosmetics', 'tattoo', 'massage', 'perfumery'],
  saude: ['pharmacy', 'dentist', 'clinic', 'doctors', 'veterinary', 'optician', 'chemist', 'medical_supply'],
  auto: ['car_wash', 'fuel', 'car_repair', 'car', 'car_parts', 'tyres', 'motorcycle'],
  servicos: ['driving_school', 'laundry', 'dry_cleaning', 'tailor', 'copyshop', 'lawyer', 'accountant', 'estate_agent', 'insurance', 'travel_agent', 'fitness_centre', 'sports_centre', 'locksmith', 'electrician', 'plumber', 'shoemaker', 'photo'],
};

function grupoDe(v, tags) {
  for (const [g, list] of Object.entries(GRUPO_DE)) if (list.includes(v)) return g;
  if (tags.healthcare) return 'saude';
  if (tags.office || tags.craft) return 'servicos';
  return tags.shop ? 'lojas' : 'servicos';
}

export async function searchNearby(center, radius) {
  const a = `(around:${Math.round(radius)},${center.lat},${center.lng})`;
  const q = `[out:json][timeout:25];(
    nwr${a}["name"]["shop"];
    nwr${a}["name"]["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|pharmacy|dentist|clinic|doctors|veterinary|car_wash|fuel|driving_school|food_court)$"];
    nwr${a}["name"]["office"~"^(lawyer|accountant|estate_agent|insurance|travel_agent)$"];
    nwr${a}["name"]["leisure"~"^(fitness_centre|sports_centre)$"];
    nwr${a}["name"]["craft"];
    nwr${a}["name"]["healthcare"];
  );out center tags 120;`;
  let ultimoErro;
  for (const url of SERVIDORES) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      return (j.elements || []).map(normalize).filter((p) => p.lat && p.nome);
    } catch (e) { ultimoErro = e; }
  }
  throw new Error('O OpenStreetMap não respondeu agora (' + (ultimoErro?.message || 'sem conexão') + '). Tente de novo em alguns segundos.');
}

function normalize(el) {
  const t = el.tags || {};
  const tipo = t.shop || t.amenity || t.office || t.leisure || t.craft || t.healthcare || '';
  let categoria = NOMES[tipo] || (tipo ? tipo.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Comércio');
  if (t.shop === 'beauty' && t.beauty === 'nails') categoria = 'Manicure';
  if (t.shop === 'hairdresser' && /barb/i.test(t.name || '')) categoria = 'Barbearia';
  if (t.cuisine && t.amenity === 'restaurant') {
    const c = { pizza: 'Pizzaria', burger: 'Hamburgueria', japanese: 'Restaurante japonês', sushi: 'Restaurante japonês', brazilian: 'Restaurante', italian: 'Restaurante italiano', chinese: 'Restaurante chinês', arab: 'Restaurante árabe' }[t.cuisine.split(';')[0]];
    if (c) categoria = c;
  }
  const rua = t['addr:street'] ? `${t['addr:street']}${t['addr:housenumber'] ? ', ' + t['addr:housenumber'] : ''}${t['addr:suburb'] ? ' - ' + t['addr:suburb'] : ''}` : '';
  const ig = t['contact:instagram'] || '';
  return {
    id: `osm-${el.type[0]}${el.id}`, osm: true, nome: t.name, categoria, grupo: grupoDe(tipo, t),
    lat: el.lat ?? el.center?.lat, lng: el.lon ?? el.center?.lon,
    telefone: t.phone || t['contact:phone'] || t['contact:mobile'] || t['contact:whatsapp'] || '',
    site: t.website || t['contact:website'] || '',
    instagram: ig ? '@' + ig.replace(/.*instagram\.com\//i, '').replace(/[/?#@].*/, '').replace(/^@/, '') : '',
    endereco: rua,
    horario: t.opening_hours ? [traduzHorario(t.opening_hours)] : [],
  };
}

// "Mo-Fr 08:00-18:00; Sa 08:00-12:00" -> "Seg-Sex 08:00-18:00; Sáb 08:00-12:00"
function traduzHorario(s) {
  const d = { Mo: 'Seg', Tu: 'Ter', We: 'Qua', Th: 'Qui', Fr: 'Sex', Sa: 'Sáb', Su: 'Dom', PH: 'Feriados', off: 'fechado' };
  return s.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH|off)\b/g, (m) => d[m]).replace('24/7', 'Aberto 24 horas');
}
