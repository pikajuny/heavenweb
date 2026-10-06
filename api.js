const Api = {
  endpoint: window.COMPYA_API_ENDPOINT || '/api/gas',
  _readActions: new Set([
    'getInitialData', 'getHitters', 'getPitchers', 'getHitterLineup', 'getPitcherLineup',
    'getTeamInfo', 'getShortcutData', 'getSkillScoreTable', 'getHitterSkills',
    'getPitcherSkills', 'getPhotoDataUrls', 'searchPlayerPhotos', 'getRankings', 'getClubSnapshot',
  ]),
  _pendingReads: new Map(),
  _loginActions: new Set(['getGoogleAuthUrl', 'loginWithToken', 'validateSavedLogin']),
  _readQueue: [],
  _activeReads: 0,

  call(action, args = []) {
    // Writes invalidate sharing so a later read cannot reuse a pre-save request.
    if (!this._readActions.has(action)) {
      this._pendingReads.clear();
      return this._loginActions.has(action) ? this._retryRead(action, args) : this._request(action, args);
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

  async _request(action, args) {
    const transient = status => [429, 502, 503, 504].includes(status);
    const recoverable = status => transient(status) || (status === 404 && this._loginActions.has(action));
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 55000);
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, args }),
        signal: controller.signal,
      });
      const text = await res.text();
      let payload;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch (_) {
        const error = new Error('서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.');
        error.retryable = recoverable(res.status);
        throw error;
      }
      if (!res.ok) {
        const error = new Error((payload && payload.error) || ('API request failed: ' + res.status));
        error.retryable = recoverable(res.status);
        throw error;
      }
      if (!payload || payload.ok !== true) {
        const upstreamStatus = payload && payload.upstreamStatus;
        const error = new Error(upstreamStatus
          ? '서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'
          : ((payload && payload.error) || 'API request failed'));
        error.code = payload && payload.code;
        error.requestId = payload && payload.requestId;
        error.retryable = recoverable(upstreamStatus);
        throw error;
      }
      return payload.result;
    } catch (error) {
      if (controller.signal.aborted) {
        const timeout = new Error(this._readActions.has(action)
          ? '데이터 조회 대기시간을 초과했습니다. 다시 불러와주세요.'
          : '응답 대기시간을 초과했습니다. 저장이 반영됐는지 확인 후 다시 시도해주세요.');
        timeout.code = 'API_TIMEOUT';
        timeout.retryable = true;
        throw timeout;
      }
      if (error instanceof TypeError) error.retryable = true;
      throw error;
    } finally {
      clearTimeout(deadline);
    }
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
