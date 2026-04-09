/**
 * ⚡ CIRCUIT BREAKER (Padrão de Resiliência Enterprise)
 * Protege integrações com hardware/APIs externas de falhas em cascata.
 *
 * Estados:
 *   CLOSED     → operação normal, falhas são contadas
 *   OPEN       → circuito aberto, rejeita imediatamente sem tentar
 *   HALF_OPEN  → testando recuperação com uma chamada de prova
 */

export const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

export class CircuitBreaker {
  /**
   * @param {object} opts
   * @param {number} opts.failureThreshold   Nº de falhas para abrir o circuito (default 3)
   * @param {number} opts.recoveryTimeout    Ms até tentar HALF_OPEN após abrir (default 30s)
   * @param {number} opts.successThreshold   Nº de sucessos em HALF_OPEN para fechar (default 1)
   * @param {string} opts.name               Nome para logging
   */
  constructor({ failureThreshold = 3, recoveryTimeout = 30000, successThreshold = 1, name = 'CircuitBreaker' } = {}) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.successThreshold = successThreshold;

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = null;

    // Listeners externos (ex: Socket.IO)
    this._listeners = {};
  }

  /**
   * Executa a função protegida pelo circuit breaker.
   * @param {Function} fn Função async a executar
   * @returns {Promise<any>}
   */
  async fire(fn) {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`[CircuitBreaker:${this.name}] Circuito ABERTO. Próxima tentativa em ${Math.ceil((this.nextAttempt - Date.now()) / 1000)}s`);
      }
      // Transição para HALF_OPEN para testar a recuperação
      this._transition(CircuitState.HALF_OPEN);
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this._transition(CircuitState.CLOSED);
      }
    }
  }

  _onFailure(err) {
    this.failureCount++;
    this.successCount = 0;

    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this._transition(CircuitState.OPEN);
    }
  }

  _transition(newState) {
    const prev = this.state;
    this.state = newState;

    if (newState === CircuitState.OPEN) {
      this.nextAttempt = Date.now() + this.recoveryTimeout;
      this.successCount = 0;
    } else if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.nextAttempt = null;
    }

    console.log(`[CircuitBreaker:${this.name}] ${prev} → ${newState}${newState === CircuitState.OPEN ? ` | Próxima tentativa: ${new Date(this.nextAttempt).toISOString()}` : ''}`);
    this._emit('stateChange', { name: this.name, prev, current: newState, nextAttempt: this.nextAttempt });
  }

  /** Registra listener para eventos do circuit breaker */
  on(event, fn) {
    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].push(fn);
    return this;
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt,
    };
  }
}
