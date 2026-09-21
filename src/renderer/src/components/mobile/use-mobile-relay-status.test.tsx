// @vitest-environment happy-dom
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useMobileRelayAuthorization } from './use-mobile-relay-status'
import type { MobileRelayStatusDetail } from '../../../../shared/mobile-relay-status'

const state = vi.hoisted(() => ({ orcaProfileAuthStatus: { state: 'local' } }))
vi.mock('@/store', () => ({
  useAppStore: (select: (value: typeof state) => unknown) => select(state)
}))
afterEach(cleanup)

it('authorizes signed-out pairing only when the runtime reports self-hosted credentials', async () => {
  let resolveStatus: (detail: MobileRelayStatusDetail) => void = () => {}
  const status = new Promise<MobileRelayStatusDetail>((resolve) => {
    resolveStatus = resolve
  })
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { mobile: { getRelayStatus: () => status, onRelayStatusChanged: () => () => {} } }
  })
  const hook = renderHook(() => useMobileRelayAuthorization())
  expect(hook.result.current).toBe(false)
  resolveStatus({ status: 'standby', selfHosted: true })
  await waitFor(() => expect(hook.result.current).toBe(true))
})
