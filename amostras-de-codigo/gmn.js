// Diagnóstico do Google Meu Negócio (nota 0–100), oportunidades e script de abordagem
import { isMobileBR } from './util.js';

const GENERICOS = ['store', 'establishment', 'point_of_interest', 'food', 'service', ''];

export function diagnose(p) {
  const checks = [];
  const add = (ok, label, pts, max, dica, nv = false) => checks.push({ ok, label, pts: ok ? pts : (pts || 0), got: pts, max, dica, naoVerificado: nv });

  add(!!p.site, p.site ? 'Tem site cadastrado' : 'Sem site no perfil', p.site ? 15 : 0, 15, 'Cliente procura e não encontra cardápio, catálogo ou serviços.');
  add(!!p.telefone, p.telefone ? 'Telefone cadastrado' : 'Sem telefone no perfil', p.telefone ? 10 : 0, 10, 'Ninguém consegue ligar ou chamar no WhatsApp direto pelo Google.');
  add(p.horario?.length > 0, p.horario?.length ? 'Horário de funcionamento preenchido' : 'Sem horário de funcionamento', p.horario?.length ? 10 : 0, 10, 'O Google pode mostrar "horário desconhecido" e o cliente desiste.');

  if (p.fotosCount == null) {
    add(false, 'Fotos (não verificado)', 0, 15, '', true);
  } else {
    const f = p.fotosCount;
    const fp = f >= 10 ? 15 : f >= 5 ? 8 : f >= 1 ? 3 : 0;
    add(fp >= 15, f >= 10 ? 'Bastante fotos (10+)' : f ? `Poucas fotos (menos de ${f >= 5 ? 10 : 5})` : 'Sem fotos', fp, 15, 'Perfis com muitas fotos recebem mais cliques e pedidos de rota.');
  }

  const r = Number(p.rating) || 0;
  const rp = r >= 4.5 ? 15 : r >= 4.0 ? 10 : r >= 3.5 ? 5 : 0;
  add(rp >= 15, r ? `Nota ${r.toFixed(1).replace('.', ',')}` : 'Sem nota ainda', rp, 15, 'Nota abaixo de 4,5 perde para o concorrente na lista do Google.');

  const n = p.reviewsCount || 0;
  const np = n >= 100 ? 15 : n >= 50 ? 10 : n >= 20 ? 5 : 0;
  add(np >= 15, `${n} avaliações`, np, 15, 'Poucas avaliações passam pouca confiança e derrubam a posição no mapa.');

  if (p.ultimaAvaliacaoDias != null) {
    const dias = p.ultimaAvaliacaoDias;
    add(dias <= 60, dias <= 60 ? 'Recebeu avaliação nos últimos 60 dias' : 'Nenhuma avaliação recente', dias <= 60 ? 10 : 0, 10, 'Perfil sem avaliações novas parece abandonado para o Google.');
  } else if (p.reviews) {
    const last = p.reviews.map((x) => x.data).filter(Boolean).sort().pop();
    const dias = last ? (Date.now() - new Date(last)) / 864e5 : Infinity;
    add(dias <= 60, dias <= 60 ? 'Recebeu avaliação nos últimos 60 dias' : 'Nenhuma avaliação recente', dias <= 60 ? 10 : 0, 10, 'Perfil sem avaliações novas parece abandonado para o Google.');
  } else {
    add(false, 'Avaliações recentes (não verificado)', 0, 10, '', true);
  }
  if (p.respondeAvaliacoes != null) {
    add(p.respondeAvaliacoes, p.respondeAvaliacoes ? 'Dono responde às avaliações' : 'Dono não responde às avaliações', p.respondeAvaliacoes ? 5 : 0, 5, 'Responder avaliações mostra cuidado e ajuda no ranqueamento.');
  }

  add(!!p.resumo, p.resumo ? 'Tem descrição do negócio' : (p.resumo === null ? 'Descrição (não verificado)' : 'Sem descrição do negócio'), p.resumo ? 5 : 0, 5, 'Uma boa descrição com palavras-chave ajuda a aparecer nas buscas.', p.resumo === null);
  const espec = p.tipo ? !GENERICOS.includes(p.tipo) : !!p.categoria;
  add(!!espec, espec ? `Categoria específica (${p.categoria || p.tipo})` : 'Categoria genérica', espec ? 5 : 0, 5, 'Categoria genérica faz o perfil sumir das buscas certas.');

  // Itens não verificados ficam fora da conta, para não punir o que não se sabe
  const conta = checks.filter((c) => !c.naoVerificado);
  const max = conta.reduce((s, c) => s + c.max, 0) || 1;
  const score = Math.round((conta.reduce((s, c) => s + (c.got || 0), 0) / max) * 100);
  return { score, checks, nivel: score < 50 ? 'hot' : score < 75 ? 'warm' : 'ok', oportunidades: oportunidades(p, score) };
}

export function oportunidades(p) {
  const o = [];
  const n = p.reviewsCount || 0, r = Number(p.rating) || 0;
  if (n < 50 || r < 4.5) o.push({ produto: 'placa', titulo: 'Placa de avaliação NFC + QR', motivo: n < 50 ? `Só ${n} avaliações: a placa no balcão transforma cliente satisfeito em avaliação na hora.` : `Nota ${r.toFixed(1).replace('.', ',')}: mais avaliações de clientes contentes puxam a média para cima.` });
  if (!p.site) o.push({ produto: 'bio', titulo: 'BioSite ou landing page', motivo: 'Não tem site. Um BioSite com WhatsApp, cardápio e rota resolve rápido e barato.' });
  if (!p.horario?.length || (p.fotosCount ?? 10) < 10 || !p.telefone) o.push({ produto: 'gmn', titulo: 'Otimização do Google Meu Negócio', motivo: 'Perfil incompleto (fotos, horário ou telefone). Dá para arrumar e subir no mapa.' });
  if (p.site && r >= 4.5 && n >= 100) o.push({ produto: 'site', titulo: 'Site profissional / renovação', motivo: 'Perfil forte. Oferta de valor maior: site novo ou landing page de campanha.' });
  return o;
}

export function tags(p, d) {
  const t = [];
  if (!p.site) t.push(['Sem site', 'hot']);
  if ((p.reviewsCount || 0) < 30) t.push([`${p.reviewsCount || 0} avaliações`, 'warm']);
  if (p.rating && p.rating < 4.3) t.push([`Nota ${String(p.rating).replace('.', ',')}`, 'warm']);
  if (!p.telefone) t.push(['Sem telefone', 'warm']);
  if (p.telefone && isMobileBR(p.telefone)) t.push(['WhatsApp', '']);
  return t;
}

export function script(p, d, vendedor = {}) {
  const nome = vendedor.nome || '[seu nome]';
  const achados = d.checks.filter((c) => !c.ok && !c.naoVerificado).slice(0, 3).map((c) => c.label.toLowerCase());
  const n = p.reviewsCount || 0;
  const r = p.rating ? String(Number(p.rating).toFixed(1)).replace('.', ',') : null;
  const prim = d.oportunidades[0];

  const abertura = `Oi, tudo bem? Sou o ${nome}, trabalho aqui na região ajudando comércios a aparecerem melhor no Google e no mapa.`;
  const gancho = achados.length
    ? `Dei uma olhada no perfil da ${p.nome} no Google e reparei que está ${achados.join(', ').replace(/, ([^,]*)$/, ' e $1')}. Quem procura "${(p.categoria || 'seu ramo').toLowerCase()} perto de mim" acaba indo no concorrente.`
    : `Dei uma olhada no perfil da ${p.nome} no Google e ele está bem cuidado${r ? `, nota ${r}` : ''}. Dá para usar isso a favor e trazer ainda mais gente.`;
  const prova = r ? `Hoje vocês têm ${n} avaliações com nota ${r}. Cada avaliação nova ajuda a subir na lista do mapa.` : 'Hoje o perfil ainda não tem nota, então as primeiras avaliações fazem muita diferença.';
  const oferta = prim?.produto === 'placa'
    ? 'Eu trabalho com uma placa de avaliação: o cliente encosta o celular ou aponta a câmera e já cai direto na tela de avaliar vocês, em 10 segundos. Fica no balcão e trabalha sozinha.'
    : prim?.produto === 'bio'
      ? 'Eu monto um BioSite com o WhatsApp, cardápio/serviços, horário e o botão de rota. Fica pronto rápido e vocês colocam no Instagram e no Google.'
      : prim?.produto === 'gmn'
        ? 'Eu faço a otimização completa do perfil: fotos, horário, categorias e descrição com as palavras que as pessoas pesquisam.'
        : 'Posso te mostrar como ficaria um site novo para vocês, aproveitando a boa reputação que já têm.';
  const fecho = 'Posso te mostrar como funciona em 2 minutinhos?';

  const objecoes = [
    ['"Não tenho dinheiro agora"', 'Entendo. A placa se paga com poucos clientes novos. Posso deixar combinado e voltar no dia que for melhor para você?'],
    ['"Já tenho Instagram"', 'Ótimo! O Google é onde o cliente procura quando já quer comprar. Um complementa o outro.'],
    ['"Vou pensar"', 'Claro. Posso voltar quinta-feira? Assim te mostro como ficaria com o nome de vocês.'],
  ];

  const whatsapp = `Oi! Aqui é o ${nome}, passei aí na ${p.nome} hoje. Como combinamos, segue o resumo: ${prim ? prim.titulo.toLowerCase() : 'melhorias no Google'}${prim ? ` (${prim.motivo.charAt(0).toLowerCase() + prim.motivo.slice(1)})` : ''}. Qualquer dúvida, é só chamar!`;

  return { texto: [abertura, gancho, prova, oferta, fecho].join('\n\n'), objecoes, whatsapp };
}
