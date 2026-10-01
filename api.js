const Api = {
  endpoint: window.COMPYA_API_ENDPOINT || '/api/gas',
  _readActions: new Set([
    'getHitters', 'getPitchers', 'getHitterLineup', 'getPitcherLineup',
    'getTeamInfo', 'getShortcutData', 'getSkillScoreTable', 'getHitterSkills',
    'getPitcherSkills', 'getPhotoDataUrls', 'searchPlayerPhotos', 'getRankings', 'getClubSnapshot',
  ]),
  _pendingReads: new Map(),
  _readQueue: [],
  _activeReads: 0,

  call(action, args = []) {
    // Writes invalidate sharing so a later read cannot reuse a pre-save request.
    if (!this._readActions.has(action)) {
      this._pendingReads.clear();
      return this._request(action, args);
    }
    const key = JSON.stringify([this.endpoint, action, args]);
    if (this._pendingReads.has(key)) return this._pendingReads.get(key);
    const request = new Promise((resolve, reject) => {
      this._readQueue.push({ action, args, resolve, reject });
      this._drainReads();
    }).finally(() => {
      if (this._pendingReads.get(key) === request) this._pendingReads.delete(key);
    });
    this._pendingReads.set(key, request);
    return request;
  },

  _drainReads() {
    while (this._activeReads < 3 && this._readQueue.length) {
      const job = this._readQueue.shift();
      this._activeReads++;
      this._retryRead(job.action, job.args).then(job.resolve, job.reject).finally(() => {
        this._activeReads--;
        this._drainReads();
      });
    }
  },

  async _retryRead(action, args) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this._request(action, args);
      } catch (error) {
        if (!error.retryable || attempt >= 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 500 * (2 ** attempt) + Math.random() * 250));
      }
    }
  },

  _request(action, args) {
    const transient = status => [429, 502, 503, 504].includes(status);
    return fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, args })
    }).catch(error => {
      error.retryable = true;
      throw error;
    }).then(async res => {
      const text = await res.text();
      let payload;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch (_) {
        const error = new Error('API returned non-JSON response: ' + text.slice(0, 300));
        error.retryable = transient(res.status);
        throw error;
      }
      if (!res.ok) {
        const error = new Error((payload && payload.error) || ('API request failed: ' + res.status));
        error.retryable = transient(res.status);
        throw error;
      }
      return payload;
    }).then(payload => {
      if (!payload || payload.ok !== true) {
        const detail = payload && payload.upstreamBody ? ' - ' + payload.upstreamBody : '';
        const error = new Error(((payload && payload.error) || 'API request failed') + detail);
        error.retryable = transient(payload && payload.upstreamStatus);
        throw error;
      }
      return payload.result;
    });
  }
};

const BoardApi = {
  endpoint: window.COMPYA_BOARD_API_ENDPOINT || '/api/board',

  call(action, args = []) {
    return fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, args })
    }).then(async res => {
      const text = await res.text();
      let payload;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch (_) {
        throw new Error('Board API returned non-JSON response: ' + text.slice(0, 300));
      }
      if (!res.ok) {
        throw new Error((payload && payload.error) || ('Board API request failed: ' + res.status));
      }
      if (!payload || payload.ok !== true) {
        throw new Error((payload && payload.error) || 'Board API request failed');
      }
      if (!payload.result || payload.result.success !== true) {
        throw new Error((payload.result && payload.result.error) || 'Board API request failed');
      }
      return payload.result.data;
    });
  }
};

const LoungeApi = {
  endpoint: window.COMPYA_LOUNGE_API_ENDPOINT || '/api/lounge',

  call(action, args = []) {
    return fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, args })
    }).then(async res => {
      const text = await res.text();
      let payload;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch (_) {
        throw new Error('Lounge API returned non-JSON response: ' + text.slice(0, 300));
      }
      if (!res.ok) {
        throw new Error((payload && payload.error) || ('Lounge API request failed: ' + res.status));
      }
      if (!payload || payload.ok !== true) {
        throw new Error((payload && payload.error) || 'Lounge API request failed');
      }
      if (!payload.result || payload.result.success !== true) {
        throw new Error((payload.result && payload.result.error) || 'Lounge API request failed');
      }
      return payload.result.data;
    });
  }
};
