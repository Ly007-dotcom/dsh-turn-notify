/**
 * Client half: browsers notifications when a turn finishes or when the agent
 * is waiting for the user. Turn ends are debounced so goal-driven rounds do
 * not produce a burst; a pending interaction notifies immediately and is
 * deduplicated by its request key.
 */
window.__ModuleLoader__.load({
  id: 'dsh-turn-notify',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'turn-notify'
    /** localStorage switch; absent means on. */
    const ENABLED_KEY = 'dsh-turn-notify:enabled'
    /** Per-notification claim key, shared by every open tab. */
    const CLAIM_PREFIX = 'dsh-turn-notify:claim:'
    /** The one-time permission prompt stays dismissed on this browser. */
    const DISMISS_KEY = 'dsh-turn-notify:prompt-dismissed'
    /** Whether a short chime plays with each notice; absent means on. */
    const SOUND_KEY = 'dsh-turn-notify:sound'
    const CLAIM_WINDOW_MS = 5000
    /** A goal can continue right after an idle beat; wait for a stable stop. */
    const TURN_END_DELAY_MS = 1800

    const dictionaries = {
      en: {
        label: 'Notifications',
        description: 'Notify me when a turn finishes or the agent waits for confirmation.',
        blocked: 'Notifications are blocked. Allow them in this site’s browser settings, then refresh.',
        unsupported: 'This browser does not support notifications.',
        turnEnd: 'Turn finished',
        needsInput: 'Waiting for your confirmation',
      },
      zh: {
        label: '完成通知',
        description: '回合结束或需要你确认时弹出浏览器通知。',
        blocked: '通知已被浏览器拦截。请在站点设置里允许通知后刷新页面。',
        unsupported: '当前浏览器不支持通知。',
        turnEnd: '回合已结束',
        needsInput: '等待你的确认',
      },
      ja: {
        label: '通知',
        description: 'ターン終了時や確認待ちのときにブラウザ通知を表示します。',
        blocked: '通知がブロックされています。このサイトの設定で許可してから再読み込みしてください。',
        unsupported: 'このブラウザは通知に対応していません。',
        turnEnd: 'ターンが終了しました',
        needsInput: '確認を待っています',
      },
      es: {
        label: 'Notificaciones',
        description: 'Avísame cuando termine un turno o el agente espere confirmación.',
        blocked: 'Las notificaciones están bloqueadas. Permítelas en la configuración del sitio y recarga.',
        unsupported: 'Este navegador no admite notificaciones.',
        turnEnd: 'Turno finalizado',
        needsInput: 'Esperando tu confirmación',
      },
      fr: {
        label: 'Notifications',
        description: 'Prévenez-moi à la fin d’un tour ou quand l’agent attend une confirmation.',
        blocked: 'Les notifications sont bloquées. Autorisez-les dans les réglages du site puis rechargez.',
        unsupported: 'Ce navigateur ne prend pas en charge les notifications.',
        turnEnd: 'Tour terminé',
        needsInput: 'En attente de votre confirmation',
      },
      de: {
        label: 'Benachrichtigungen',
        description: 'Benachrichtige mich am Ende eines Turns oder wenn der Agent auf Bestätigung wartet.',
        blocked: 'Benachrichtigungen sind blockiert. Erlaube sie in den Website-Einstellungen und lade neu.',
        unsupported: 'Dieser Browser unterstützt keine Benachrichtigungen.',
        turnEnd: 'Turn beendet',
        needsInput: 'Warte auf deine Bestätigung',
      },
      ru: {
        label: 'Уведомления',
        description: 'Уведомлять о завершении хода или ожидании подтверждения.',
        blocked: 'Уведомления заблокированы. Разрешите их в настройках сайта и обновите страницу.',
        unsupported: 'Этот браузер не поддерживает уведомления.',
        turnEnd: 'Ход завершён',
        needsInput: 'Ожидает вашего подтверждения',
      },
      pt: {
        label: 'Notificações',
        description: 'Avise-me quando um turno terminar ou o agente esperar confirmação.',
        blocked: 'As notificações estão bloqueadas. Permita-as nas definições do site e recarregue.',
        unsupported: 'Este navegador não suporta notificações.',
        turnEnd: 'Turno concluído',
        needsInput: 'Aguardando a sua confirmação',
      },
    }

    /** Copy used by the enable prompt and the switch's current-state line. */
    const stateCopy = {
      en: {
        enableTitle: 'Turn notifications',
        enableBody: 'Get notified when a turn finishes or the agent waits for you.',
        enableAction: 'Enable',
        later: 'Not now',
        onText: 'On — you will be notified when a turn ends or waits for you.',
        offText: 'Off.',
        unasked: 'Turn this on to let the browser ask for notification permission.',
        test: 'Send a test notification',
        testBody: 'Notifications are working.',
      },
      zh: {
        enableTitle: '完成通知',
        enableBody: '回合结束或 Agent 需要你确认时提醒你。',
        enableAction: '开启',
        later: '以后再说',
        onText: '已开启：回合结束或需要确认时会提醒你。',
        offText: '已关闭。',
        unasked: '打开开关后浏览器会向你申请通知权限。',
        test: '发送测试通知',
        testBody: '通知可以正常弹出。',
      },
      ja: {
        enableTitle: 'ターン通知',
        enableBody: 'ターン終了時や確認待ちのときに通知します。',
        enableAction: '有効にする',
        later: 'あとで',
        onText: '有効：ターン終了時や確認待ちのときに通知します。',
        offText: '無効。',
        unasked: 'オンにするとブラウザが通知の許可を求めます。',
        test: 'テスト通知を送信',
        testBody: '通知は正常に動作しています。',
      },
      es: {
        enableTitle: 'Notificaciones de turno',
        enableBody: 'Recibe un aviso cuando termine un turno o el agente te espere.',
        enableAction: 'Activar',
        later: 'Ahora no',
        onText: 'Activadas: te avisaremos al terminar un turno o esperar confirmación.',
        offText: 'Desactivadas.',
        unasked: 'Actívalas para que el navegador solicite permiso.',
        test: 'Enviar notificación de prueba',
        testBody: 'Las notificaciones funcionan.',
      },
      fr: {
        enableTitle: 'Notifications de tour',
        enableBody: 'Soyez prévenu à la fin d’un tour ou quand l’agent vous attend.',
        enableAction: 'Activer',
        later: 'Plus tard',
        onText: 'Activées : vous serez prévenu à la fin d’un tour ou en attente de confirmation.',
        offText: 'Désactivées.',
        unasked: 'Activez pour que le navigateur demande l’autorisation.',
        test: 'Envoyer une notification de test',
        testBody: 'Les notifications fonctionnent.',
      },
      de: {
        enableTitle: 'Turn-Benachrichtigungen',
        enableBody: 'Werde benachrichtigt, wenn ein Turn endet oder der Agent auf dich wartet.',
        enableAction: 'Aktivieren',
        later: 'Später',
        onText: 'Aktiv – Benachrichtigung am Turn-Ende oder bei Rückfragen.',
        offText: 'Aus.',
        unasked: 'Aktiviere, damit der Browser nach der Erlaubnis fragt.',
        test: 'Testbenachrichtigung senden',
        testBody: 'Benachrichtigungen funktionieren.',
      },
      ru: {
        enableTitle: 'Уведомления о ходе',
        enableBody: 'Узнавайте о завершении хода или ожидании подтверждения.',
        enableAction: 'Включить',
        later: 'Позже',
        onText: 'Включено: уведомляем о завершении хода и ожидании ответа.',
        offText: 'Выключено.',
        unasked: 'Включите, чтобы браузер запросил разрешение.',
        test: 'Отправить тестовое уведомление',
        testBody: 'Уведомления работают.',
      },
      pt: {
        enableTitle: 'Notificações de turno',
        enableBody: 'Receba um aviso quando um turno terminar ou o agente aguardar você.',
        enableAction: 'Ativar',
        later: 'Agora não',
        onText: 'Ativadas: avisamos ao terminar um turno ou aguardar confirmação.',
        offText: 'Desativadas.',
        unasked: 'Ative para o navegador pedir permissão.',
        test: 'Enviar notificação de teste',
        testBody: 'As notificações estão funcionando.',
      },
    }
    for (const id of Object.keys(stateCopy)) Object.assign(dictionaries[id], stateCopy[id])
    const dismissLabels = { en: 'Dismiss', zh: '关闭', ja: '閉じる', es: 'Cerrar', fr: 'Fermer', de: 'Schließen', ru: 'Закрыть', pt: 'Fechar' }
    for (const id of Object.keys(dismissLabels)) dictionaries[id].dismiss = dismissLabels[id]
    const soundCopy = {
      en: { soundLabel: 'Sound', soundDesc: 'Play a short chime with each notice.' },
      zh: { soundLabel: '提示音', soundDesc: '每次提示时播放一声轻提示。' },
      ja: { soundLabel: '通知音', soundDesc: '通知のたびに短いチャイムを鳴らします。' },
      es: { soundLabel: 'Sonido', soundDesc: 'Reproduce un breve tono con cada aviso.' },
      fr: { soundLabel: 'Son', soundDesc: 'Joue un court carillon à chaque notification.' },
      de: { soundLabel: 'Ton', soundDesc: 'Spielt bei jeder Benachrichtigung einen kurzen Ton.' },
      ru: { soundLabel: 'Звук', soundDesc: 'Короткий сигнал при каждом уведомлении.' },
      pt: { soundLabel: 'Som', soundDesc: 'Toca um breve sinal a cada aviso.' },
    }
    for (const id of Object.keys(soundCopy)) Object.assign(dictionaries[id], soundCopy[id])

    const CSS = `
.dsh-turn-notify-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
}
.dsh-turn-notify-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dsh-turn-notify-title {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
}
.dsh-turn-notify-desc {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.dsh-turn-notify-desc[data-tone='warn'] {
  color: var(--dsw-alias-state-warn-primary);
}
.dsh-turn-notify-switch {
  flex: none;
  width: 36px;
  height: 20px;
  padding: 2px;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  cursor: pointer;
  appearance: none;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.dsh-turn-notify-switch[aria-checked='true'] {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-brand-primary);
}
.dsh-turn-notify-switch:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.dsh-turn-notify-knob {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--dsw-alias-label-primary);
  transform: translateX(0);
  transition: transform 120ms ease;
}
.dsh-turn-notify-switch[aria-checked='true'] .dsh-turn-notify-knob {
  background: var(--dsw-alias-bg-base);
  transform: translateX(16px);
}
.dsh-turn-notify-link {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: var(--dsw-alias-brand-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.dsh-turn-notify-link:hover {
  text-decoration: underline;
}
.dsh-turn-notify-prompt {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 300px;
  max-width: calc(100vw - 32px);
  padding: 14px;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay);
}
.dsh-turn-notify-prompt-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dsh-turn-notify-prompt-title {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 500;
}
.dsh-turn-notify-prompt-body {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.dsh-turn-notify-prompt-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dsh-turn-notify-prompt-primary {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-base);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.dsh-turn-notify-toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 61;
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 300px;
  max-width: calc(100vw - 32px);
  padding: 12px 14px;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay);
  cursor: pointer;
}
.dsh-turn-notify-toast-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1 1 auto;
}
.dsh-turn-notify-toast-title {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-turn-notify-toast-body {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.dsh-turn-notify-toast-close {
  flex: none;
  padding: 0 2px;
  border: none;
  background: none;
  color: var(--dsw-alias-label-secondary);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
`

    /** Whether the switch is on; a missing value means on. */
    function readEnabled() {
      try {
        return globalThis.localStorage?.getItem(ENABLED_KEY) !== '0'
      } catch (_error) {
        return true
      }
    }

    function writeEnabled(value) {
      try {
        globalThis.localStorage?.setItem(ENABLED_KEY, value ? '1' : '0')
      } catch (_error) {
        // A blocked storage area only loses the preference, not the feature.
      }
    }

    /** Whether the one-time permission prompt was dismissed in this browser. */
    function readDismissed() {
      try {
        return globalThis.localStorage?.getItem(DISMISS_KEY) === '1'
      } catch (_error) {
        return false
      }
    }

    function writeDismissed(value) {
      try {
        globalThis.localStorage?.setItem(DISMISS_KEY, value ? '1' : '0')
      } catch (_error) {
        // Same as above: only the prompt state is lost.
      }
    }

    /** Whether the chime is on; a missing value means on. */
    function readSound() {
      try {
        return globalThis.localStorage?.getItem(SOUND_KEY) !== '0'
      } catch (_error) {
        return true
      }
    }

    function writeSound(value) {
      try {
        globalThis.localStorage?.setItem(SOUND_KEY, value ? '1' : '0')
      } catch (_error) {
        // A blocked storage area only loses the preference.
      }
    }

    /** Lazily created audio context, reused across notices. */
    let audioContext

    /**
     * Play a short two-tone chime. Browsers only allow audio after a user
     * gesture, so a fresh page stays silent until the user interacts once.
     */
    function playChime() {
      if (!readSound()) return
      try {
        const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext
        if (Ctor === undefined) return
        audioContext ??= new Ctor()
        if (audioContext.state === 'suspended') void audioContext.resume()
        const now = audioContext.currentTime
        const gain = audioContext.createGain()
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26)
        gain.connect(audioContext.destination)
        for (const [frequency, offset] of [[880, 0], [1320, 0.09]]) {
          const oscillator = audioContext.createOscillator()
          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(frequency, now + offset)
          oscillator.connect(gain)
          oscillator.start(now + offset)
          oscillator.stop(now + 0.28)
        }
      } catch (_error) {
        // Audio is a nicety; a blocked context leaves the notice intact.
      }
    }

    /**
     * Ask the browser for permission. Must run inside a user gesture.
     * @returns the resulting permission state.
     */
    async function requestPermission() {
      if (typeof globalThis.Notification === 'undefined') return 'unsupported'
      if (globalThis.Notification.permission !== 'default') return globalThis.Notification.permission
      try {
        return await globalThis.Notification.requestPermission()
      } catch (_error) {
        return 'denied'
      }
    }

    /** Prove delivery end to end, right after enabling and from the test action. */
    function fireConfirmation(t) {
      pushToast({ title: t('enableTitle'), body: t('testBody') })
      playChime()
      if (typeof globalThis.Notification === 'undefined') return
      if (globalThis.Notification.permission !== 'granted') return
      try {
        new globalThis.Notification(t('enableTitle'), {
          body: t('testBody'),
          tag: 'dsh-turn-notify:test',
          renotify: true,
        })
      } catch (error) {
        console.warn('[turn-notify] test notification failed:', error)
      }
    }

    /**
     * Claim one notification across every open tab, so the same completion is
     * announced once even with several pages of this GUI open.
     * @param key - stable identity of the event being announced.
     * @returns whether this tab should announce it.
     */
    function claim(key) {
      try {
        const storageKey = CLAIM_PREFIX + key
        const previous = Number(globalThis.localStorage?.getItem(storageKey) ?? 0)
        const now = Date.now()
        if (Number.isFinite(previous) && now - previous < CLAIM_WINDOW_MS) return false
        globalThis.localStorage?.setItem(storageKey, String(now))
        return true
      } catch (_error) {
        return true
      }
    }

    /** In-app notice state shared by the announcer and the overlay component. */
    let toastEntry = null
    let toastTimer
    const toastListeners = new Set()

    /** Publish one in-app notice; it outlives neither the timer nor the next notice. */
    function pushToast(entry) {
      toastEntry = entry
      for (const listener of toastListeners) listener()
      if (toastTimer !== undefined) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        toastTimer = undefined
        toastEntry = null
        for (const listener of toastListeners) listener()
      }, 8000)
    }

    function clearToast() {
      if (toastTimer !== undefined) clearTimeout(toastTimer)
      toastTimer = undefined
      toastEntry = null
      for (const listener of toastListeners) listener()
    }

    /** Final path segment, used when a session has no stored title yet. */
    function baseName(path) {      if (typeof path !== 'string' || path === '') return ''
      const trimmed = path.replace(/[/\\]+$/, '')
      const cut = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
      return trimmed.slice(cut + 1)
    }

    /** Session title fallback chain: stored title, workspace name, generic label. */
    function sessionTitle(summary) {
      const title = typeof summary?.title === 'string' ? summary.title.trim() : ''
      return title || baseName(summary?.cwd) || 'DSH'
    }

    /** Settings row with the switch that asks the browser for permission. */
    function NotificationsRow(props) {
      const t = typeof props.t === 'function' ? props.t : key => dictionaries.en[key] ?? key
      const supported = typeof globalThis.Notification !== 'undefined'
      const [enabled, setEnabled] = React.useState(readEnabled)
      const [permission, setPermission] = React.useState(supported ? globalThis.Notification.permission : 'unsupported')

      const enable = async () => {
        const next = await requestPermission()
        setPermission(next)
        if (next === 'granted') {
          writeEnabled(true)
          setEnabled(true)
          fireConfirmation(t)
        }
      }

      const toggle = () => {
        if (!supported) return
        if (enabled && permission === 'granted') {
          writeEnabled(false)
          setEnabled(false)
          return
        }
        void enable()
      }

      const active = enabled && permission === 'granted'
      const description = !supported ? t('unsupported')
        : permission === 'denied' ? t('blocked')
          : permission === 'default' ? t('unasked')
            : active ? t('onText') : t('offText')
      return h('div', { className: 'dsh-turn-notify-row' },
        h('style', null, CSS),
        h('div', { className: 'dsh-turn-notify-copy' },
          h('span', { className: 'dsh-turn-notify-title' }, t('label')),
          h('span', {
            className: 'dsh-turn-notify-desc',
            'data-tone': !supported || permission === 'denied' ? 'warn' : undefined,
          }, description),
          permission === 'granted'
            ? h('button', {
              type: 'button',
              className: 'dsh-turn-notify-link',
              onClick: () => { fireConfirmation(t) },
            }, t('test'))
            : null),
        h('button', {
          type: 'button',
          role: 'switch',
          'aria-checked': active ? 'true' : 'false',
          'aria-label': t('label'),
          className: 'dsh-turn-notify-switch',
          onClick: toggle,
          disabled: !supported,
        }, h('span', { className: 'dsh-turn-notify-knob' })))
    }

    /**
     * One-time prompt so the feature is discoverable: browser permission can
     * only be requested from a click, and the Settings row alone is easy to miss.
     */
    function EnablePrompt(props) {
      const t = typeof props.t === 'function' ? props.t : key => dictionaries.en[key] ?? key
      const supported = typeof globalThis.Notification !== 'undefined'
      const [dismissed, setDismissed] = React.useState(readDismissed)
      const [permission, setPermission] = React.useState(supported ? globalThis.Notification.permission : 'unsupported')
      if (!supported || dismissed || permission !== 'default') return null

      const enable = async () => {
        const next = await requestPermission()
        setPermission(next)
        writeDismissed(true)
        setDismissed(true)
        if (next === 'granted') {
          writeEnabled(true)
          fireConfirmation(t)
        }
      }
      const later = () => {
        writeDismissed(true)
        setDismissed(true)
      }
      return h('div', { className: 'dsh-turn-notify-prompt' },
        h('style', null, CSS),
        h('div', { className: 'dsh-turn-notify-prompt-copy' },
          h('span', { className: 'dsh-turn-notify-prompt-title' }, t('enableTitle')),
          h('span', { className: 'dsh-turn-notify-prompt-body' }, t('enableBody'))),
        h('div', { className: 'dsh-turn-notify-prompt-actions' },
          h('button', {
            type: 'button',
            className: 'dsh-turn-notify-prompt-primary',
            onClick: () => { void enable() },
          }, t('enableAction')),
          h('button', {
            type: 'button',
            className: 'dsh-turn-notify-link',
            onClick: later,
          }, t('later'))))
    }

    /** Second settings row: whether the chime plays with a notice. */
    function SoundRow(props) {
      const t = typeof props.t === 'function' ? props.t : key => dictionaries.en[key] ?? key
      const [enabled, setEnabled] = React.useState(readSound)
      const toggle = () => {
        const next = !enabled
        writeSound(next)
        setEnabled(next)
        if (next) playChime()
      }
      return h('div', { className: 'dsh-turn-notify-row' },
        h('style', null, CSS),
        h('div', { className: 'dsh-turn-notify-copy' },
          h('span', { className: 'dsh-turn-notify-title' }, t('soundLabel')),
          h('span', { className: 'dsh-turn-notify-desc' }, t('soundDesc'))),
        h('button', {
          type: 'button',
          role: 'switch',
          'aria-checked': enabled ? 'true' : 'false',
          'aria-label': t('soundLabel'),
          className: 'dsh-turn-notify-switch',
          onClick: toggle,
        }, h('span', { className: 'dsh-turn-notify-knob' })))
    }

    /**
     * In-app notice shown alongside the system notification, so a completion
     * stays visible even where the OS suppresses banners.
     */
    function NotificationToast(props) {
      const t = typeof props.t === 'function' ? props.t : key => dictionaries.en[key] ?? key
      const [entry, setEntry] = React.useState(toastEntry)
      React.useEffect(() => {
        const listener = () => { setEntry(toastEntry) }
        toastListeners.add(listener)
        listener()
        return () => { toastListeners.delete(listener) }
      }, [])
      if (entry === null) return null
      const open = () => {
        if (typeof entry.sessionId === 'string' && typeof props.openSession === 'function') {
          try {
            props.openSession(entry.sessionId)
          } catch (_error) {
            // Opening is best effort; the notice still dismisses.
          }
        }
        clearToast()
      }
      return h('div', { className: 'dsh-turn-notify-toast', role: 'status', onClick: open },
        h('style', null, CSS),
        h('div', { className: 'dsh-turn-notify-toast-copy' },
          h('span', { className: 'dsh-turn-notify-toast-title' }, entry.title),
          h('span', { className: 'dsh-turn-notify-toast-body' }, entry.body)),
        h('button', {
          type: 'button',
          className: 'dsh-turn-notify-toast-close',
          'aria-label': t('dismiss'),
          onClick: (event) => {
            event.stopPropagation()
            clearToast()
          },
        }, '×'))
    }

    return {
      inject: ['slots', 'locale', 'sessions', 'uiSession', 'uiWorkspace'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, dictionaries), 'turn-notify: dictionaries')
        const t = ctx.locale.bind(NS)

        /** Announce one event through the browser; silently no-ops without permission. */
        const announce = (sessionId, kind, interaction, summary) => {
          const permission = typeof globalThis.Notification === 'undefined' ? 'unsupported' : globalThis.Notification.permission
          if (!readEnabled()) return
          const key = sessionId + ':' + kind + ':' + (interaction?.key ?? summary?.updatedAt ?? '')
          if (!claim(key)) return
          const body = kind === 'needs-input' ? t('needsInput') : t('turnEnd')
          const title = sessionTitle(summary)
          // The in-app notice is the reliable channel; the system notification is
          // attempted when the browser allows it, and its absence changes nothing.
          pushToast({ title, body, sessionId })
          playChime()
          if (permission !== 'granted') return
          try {
            const notification = new globalThis.Notification(title, {
              body,
              tag: 'dsh-turn-notify:' + sessionId,
              // Re-alert when a newer event replaces the previous notice for this Session.
              renotify: true,
            })
            notification.onclick = () => {
              try {
                globalThis.focus()
                ctx.uiWorkspace.openSession(sessionId)
              } catch (_error) {
                // Navigation is best effort; the notification still dismisses itself.
              }
              notification.close()
            }
          } catch (error) {
            console.warn('[turn-notify] system notification failed:', error)
          }
        }

        ctx.effect(() => {
          const status = ctx.uiSession.sessionStatus
          const timers = new Map()
          /** Previous observation per Session; absent until the baseline pass. */
          let previous = null

          const cancel = (sessionId) => {
            const timer = timers.get(sessionId)
            if (timer === undefined) return
            clearTimeout(timer)
            timers.delete(sessionId)
          }

          const sessionSummary = (sessionId) => {
            try {
              return ctx.sessions.list.getSnapshot()?.byId?.[sessionId]
            } catch (_error) {
              return undefined
            }
          }

          const schedule = (sessionId) => {
            cancel(sessionId)
            const timer = setTimeout(() => {
              timers.delete(sessionId)
              const current = status.getSnapshot().get(sessionId)
              if (current === undefined || current.running !== false) return
              // A pending interaction ends the turn too; its own notice already covers it.
              if (current.pendingInteraction !== undefined) return
              announce(sessionId, 'turn-end', undefined, sessionSummary(sessionId))
            }, TURN_END_DELAY_MS)
            timers.set(sessionId, timer)
          }

          const evaluate = () => {
            const snapshot = status.getSnapshot()
            const next = new Map()
            for (const [sessionId, value] of snapshot) {
              const summary = sessionSummary(sessionId)
              const pendingKey = value.pendingInteraction?.key
              next.set(sessionId, { running: value.running, pendingKey })
              if (previous === null) continue
              const before = previous.get(sessionId)
              if (before === undefined) continue
              // Subagent runs finish constantly; only the sessions the user
              // opened are worth interrupting for.
              if (summary?.origin === 'subagent' || summary?.blank === true) continue
              if (pendingKey !== undefined && pendingKey !== before.pendingKey) {
                announce(sessionId, 'needs-input', value.pendingInteraction, summary)
              }
              if (value.running === true) cancel(sessionId)
              if (value.running === false && before.running === true) schedule(sessionId)
            }
            for (const sessionId of timers.keys()) {
              if (!next.has(sessionId)) cancel(sessionId)
            }
            previous = next
          }

          const stop = status.subscribe(evaluate)
          evaluate()
          return () => {
            stop()
            for (const timer of timers.values()) clearTimeout(timer)
            timers.clear()
          }
        }, 'turn-notify: session status')

        ctx.slots.inject('settings.general.item', () => ctx.slots.register({
          name: 'settings.general.item',
          id: 'turn-notify',
          order: 40,
          locale: NS,
        }, NotificationsRow))

        ctx.slots.inject('settings.general.item', () => ctx.slots.register({
          name: 'settings.general.item',
          id: 'turn-notify-sound',
          order: 41,
          locale: NS,
        }, SoundRow))

        // Permission needs a click, so offer one visible entry point instead of
        // relying on the Settings row alone.
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'turn-notify-prompt',
          order: 50,
          locale: NS,
        }, EnablePrompt))

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'turn-notify-toast',
          order: 51,
          locale: NS,
          inject: () => ({ openSession: (sessionId) => { ctx.uiWorkspace.openSession(sessionId) } }),
        }, NotificationToast))
      },
    }
  },
})
