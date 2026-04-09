/**
 * 🌍 ANOMALY ENGINE 3.0: Impossible Travel & Anti-Proxy
 * Monitoramento geográfico avançado para o CRM Bacch.
 */

// Cache em memória para IPs (Simulando IP Geolocation para não depender de APIs externas pagas no dev)
// Em produção, deve usar uma base DB-IP ou MaxMind.
const geoCache = new Map();

export const AnomalyService = {
  
  /**
   * Tenta encontrar a localização aproximada do IP
   */
  async getIpLocation(ip) {
    if (geoCache.has(ip)) return geoCache.get(ip);
    
    // Mock de Geolocation (Para fins demonstrativos no localhost)
    // Se o IP for de loopback ou privado, retorna "LOCAL"
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168')) {
        return { city: 'Local', region: 'SP', country: 'BR', lat: -23.55, lon: -46.63 };
    }

    // Heurística simples: Simula divergência se o IP mudar drasticamente de classe
    const hash = ip.split('.').reduce((acc, part) => acc + parseInt(part), 0);
    const loc = {
        city: hash % 2 === 0 ? 'São Paulo' : 'Rio de Janeiro',
        lat: hash % 2 === 0 ? -23.55 : -22.90,
        lon: hash % 2 === 0 ? -46.63 : -43.17
    };
    
    geoCache.set(ip, loc);
    return loc;
  },

  /**
   * Calcula distância entre coordenadas (Haversine Formula)
   */
  getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  /**
   * Heurística de Impossible Travel
   */
  async checkImpossibleTravel(lastCheckin, currentIp) {
    if (!lastCheckin || !lastCheckin.ip) return { anomaly: false };

    const loc1 = await this.getIpLocation(lastCheckin.ip);
    const loc2 = await this.getIpLocation(currentIp);

    const distance = this.getDistance(loc1.lat, loc1.lon, loc2.lat, loc2.lon);
    const timeInHours = (Date.now() - new Date(lastCheckin.criado_em).getTime()) / (1000 * 60 * 60);

    // Se velocidade média for > 800km/h (Avião Comercial)
    const speed = distance / Math.max(timeInHours, 0.01);
    
    if (speed > 800 && distance > 100) {
        return { 
            anomaly: true, 
            score: 50, 
            reason: `Impossible Travel: ${distance.toFixed(0)}km em ${timeInHours.toFixed(2)}h (${speed.toFixed(0)}km/h)` 
        };
    }
    return { anomaly: false };
  },

  /**
   * Anti-Proxy / VPN Check (Dumb heuristic for local dev)
   */
  async checkAntiProxy(ip) {
    // IPs conhecidos de data centers (Mock)
    const dcRanges = ['20.','23.','52.','104.']; 
    if (dcRanges.some(range => ip.startsWith(range))) {
        return { anomaly: true, score: 30, reason: 'Acesso via Data Center / VPN Detectado' };
    }
    return { anomaly: false };
  }
};
