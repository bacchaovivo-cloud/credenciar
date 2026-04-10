/**
 * 📈 ZENITH PREDICTIVE ENGINE
 * Inteligência estatística para projeção de fluxo e detecção de gargalos.
 */

export const PredictiveService = {
  
  /**
   * Calcula a estimativa de tempo (em minutos) para atingir a lotação total.
   * Utiliza Regressão Linear Simples baseada nos últimos check-ins.
   */
  calcularETA(totalInscritos, presentesAtuais, historicoMinutos) {
    if (!historicoMinutos || historicoMinutos.length < 5) return null;
    if (presentesAtuais >= totalInscritos) return 0;

    const faltantes = totalInscritos - presentesAtuais;
    
    // Regressão Linear: y = mx + b
    // x = tempo (minutos), y = check-ins acumulados
    const n = historicoMinutos.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    historicoMinutos.forEach((point, i) => {
      sumX += i;
      sumY += point.qtd;
      sumXY += i * point.qtd;
      sumX2 += i * i;
    });

    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (m <= 0) return null; // Fluxo parando ou negativo (improvável)

    const minutosRestantes = Math.round(faltantes / m);
    return Math.max(0, minutosRestantes);
  },

  /**
   * Detecta se há um gargalo operacional comparando a média curta vs média longa.
   */
  detectarGargalo(fluxoRecente, mediaHistorica) {
    const threshold = 1.4; // 40% acima da média histórica sugere gargalo
    return fluxoRecente > (mediaHistorica * threshold);
  },

  /**
   * Gera um heatmap de densidade 2D para visualização estratégica.
   */
  gerarHeatmap(dados) {
    // Normalização para escala 0-1
    if (!dados || dados.length === 0) return [];
    const max = Math.max(...dados.map(d => d.qtd));
    return dados.map(d => ({
      ...d,
      intensity: max > 0 ? d.qtd / max : 0
    }));
  }
};
